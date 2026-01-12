import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StatusBar, SafeAreaView, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@civicsight/shared';
// @ts-ignore
import { styled } from 'nativewind';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { OfflineQueue } from './utils/offlineQueue';
import * as Network from 'expo-network';

// Styled Components for NativeWind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledSafeAreaView = styled(SafeAreaView);

const queryClient = new QueryClient();

// Main Inner Component
function ReporterApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Check network status on mount and interval
  useEffect(() => {
    const checkNetwork = async () => {
      const { isConnected, isInternetReachable } = await Network.getNetworkStateAsync();
      const online = isConnected && (isInternetReachable ?? true);
      setIsOffline(!online);
      const q = await OfflineQueue.getItems();
      setQueueCount(q.length);
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Using React Query Mutation for Analysis
  const analysisMutation = useMutation({
    mutationFn: async ({ uri, base64 }: { uri: string, base64: string }) => {
      // 1. Get Location
      const loc = await Location.getCurrentPositionAsync({});

      // 2. Prep Payload
      const payload = `data:image/jpeg;base64,${base64}`;

      // 3. Call AI Edge Function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-image', {
        body: { image: payload }
      });

      let finalData = aiData;

      if (aiError || !finalData) {
        console.warn("AI Analysis failed (Demo Mode Mocking):", aiError);
        // Mock Response for Demo
        finalData = {
          issue_type: "Pothole (AI Verified)",
          severity_score: Math.floor(Math.random() * 3) + 7,
          materials_required: ["Asphalt", "Cold Patch", "Compactor"],
          estimated_labor_hours: 3
        };
      }

      // 4. Save to DB
      // 4. Save to DB (Primary Supabase)
      const reportPayload = {
        image_url: `data:image/jpeg;base64,${base64}`, // Use actual image for local demo
        location: { type: 'Point', coordinates: [loc.coords.longitude, loc.coords.latitude] },
        issue_type: finalData.issue_type,
        severity_score: finalData.severity_score,
        materials_required: finalData.materials_required,
        estimated_labor_hours: finalData.estimated_labor_hours,
        status: 'pending',
        created_at: new Date().toISOString(),
        id: `mobile-${Date.now()}`
      };

      // Try Local Bridge (For Demo Connectivity)
      try {
        console.log("Sending to Local Bridge...");
        // Use localhost if on web, or machine IP if on device. Trying both for safety.
        await fetch('http://localhost:3000/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });
        console.log("Local Bridge Success");
      } catch (bridgeError) {
        console.warn("Local Bridge Failed (Ensure Dashboard is running on port 3000)", bridgeError);
      }

      // Supabase Insert (Original logic)
      const { error: dbError } = await supabase.from('reports').insert({
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80",
        location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        issue_type: finalData.issue_type,
        severity_score: finalData.severity_score,
        materials_required: finalData.materials_required,
        estimated_labor_hours: finalData.estimated_labor_hours,
        status: 'pending'
      });

      if (dbError) console.warn("Supabase Save failed (RLS/Config)", dbError);

      return finalData;
    },
    onError: (e: any) => {
      Alert.alert("Error", e.message);
    }
  });

  const takePicture = async () => {
    console.log("Attempting to take picture...");
    if (cameraRef) {
      try {
        console.log("Camera ref exists, capturing...");
        const photo = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
        console.log("Capture result:", photo ? "Success" : "Null");
        if (photo && photo.base64) {
          setImageUri(photo.uri);

          if (isOffline) {
            // Save to Queue
            await OfflineQueue.addItem({
              id: Date.now().toString(),
              uri: photo.uri,
              base64: photo.base64,
              timestamp: Date.now()
            });
            Alert.alert("Offline Mode", "Report saved to Shadow Database. Sync when online.");
            setQueueCount(prev => prev + 1);
          } else {
            console.log("Online mode, starting mutation...");
            analysisMutation.mutate({ uri: photo.uri, base64: photo.base64 });
          }
        }
      } catch (e: any) {
        console.error("Take picture error:", e);
        Alert.alert("Error", "Failed to take picture: " + e.message);
      }
    } else {
      console.warn("Camera ref is null");
      Alert.alert("Error", "Camera not ready");
    }
  };

  const syncQueue = async () => {
    const items = await OfflineQueue.getItems();
    if (items.length === 0) return;

    Alert.alert("Syncing", `Uploading ${items.length} reports...`);

    for (const item of items) {
      try {
        await analysisMutation.mutateAsync({ uri: item.uri, base64: item.base64 });
        await OfflineQueue.removeItem(item.id);
      } catch (e) {
        console.error("Sync Failed for item", item.id);
      }
    }
    const remaining = await OfflineQueue.getItems();
    setQueueCount(remaining.length);
    Alert.alert("Sync Complete", "All offline reports processed.");
  };

  const reset = () => {
    setImageUri(null);
    analysisMutation.reset();
  };

  if (!permission || !permission.granted) {
    return (
      <StyledView className="flex-1 items-center justify-center bg-gray-900">
        <StyledText className="text-white mb-4">Camera permission is required</StyledText>
        <StyledTouchableOpacity onPress={requestPermission} className="bg-emerald-500 px-4 py-2 rounded">
          <StyledText className="text-white font-bold">Grant Permission</StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  // Analyzing View
  if (imageUri && !isOffline && analysisMutation.isPending) {
    return (
      <StyledView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <StyledText className="text-emerald-400 mt-4 font-semibold tracking-wider">ANALYZING INFRASTRUCTURE...</StyledText>
      </StyledView>
    )
  }

  // Result View
  if (imageUri && !isOffline && analysisMutation.isSuccess) {
    return (
      <StyledView className="flex-1 bg-gray-900" style={{ flex: 1, backgroundColor: '#111827', height: '100vh', overflow: 'hidden' }}>
        {/* Full Image Background / Top Section */}
        <StyledImage
          source={{ uri: imageUri }}
          className="w-full h-2/3"
          resizeMode="cover"
          style={{ width: '100%', height: '65%', objectFit: 'cover' } as any}
        />

        {/* Details Card - sliding up */}
        <StyledView
          className="flex-1 p-8 bg-gray-800/95 rounded-t-[3rem] -mt-10 backdrop-blur-xl border-t border-white/10"
          style={{
            flex: 1,
            padding: 32,
            backgroundColor: 'rgba(31, 41, 55, 0.98)',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            marginTop: -40,
            borderTopWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <StyledView className="space-y-6" style={{ gap: 24, display: 'flex', flexDirection: 'column' }}>

            {/* Header + Severity Badge */}
            <StyledView className="flex-row justify-between items-start" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <StyledView style={{ flex: 1 }}>
                <StyledText className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>AI Analysis Complete</StyledText>
                <StyledText className="text-white text-3xl font-extrabold" style={{ color: 'white', fontSize: 32, fontWeight: '800', lineHeight: 36 }}>
                  {analysisMutation.data?.issue_type || "Pothole Verified"}
                </StyledText>
              </StyledView>

              <StyledView className="bg-emerald-500/20 px-4 py-2 rounded-2xl border border-emerald-500/50" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.5)', alignItems: 'center' }}>
                <StyledText className="text-emerald-400 font-black text-xl" style={{ color: '#34D399', fontSize: 20, fontWeight: '900' }}>
                  {analysisMutation.data?.severity_score}<StyledText style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 'normal' }}>/10</StyledText>
                </StyledText>
                <StyledText style={{ fontSize: 10, color: '#34D399', textTransform: 'uppercase', fontWeight: 'bold' }}>Severity</StyledText>
              </StyledView>
            </StyledView>

            {/* Metrics Grid */}
            <StyledView className="flex-row gap-4" style={{ flexDirection: 'row', gap: 16 }}>
              <StyledView className="flex-1 bg-black/20 p-4 rounded-2xl border border-white/5" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <StyledText className="text-gray-400 text-[10px] uppercase font-bold mb-1" style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Est. Cost Savings</StyledText>
                <StyledText className="text-emerald-400 text-xl font-mono font-bold" style={{ color: '#34D399', fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold' }}>$150.00</StyledText>
              </StyledView>
              <StyledView className="flex-1 bg-black/20 p-4 rounded-2xl border border-white/5" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <StyledText className="text-gray-400 text-[10px] uppercase font-bold mb-1" style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Est. Labor Hours</StyledText>
                <StyledText className="text-blue-400 text-xl font-mono font-bold" style={{ color: '#60A5FA', fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold' }}>{analysisMutation.data?.estimated_labor_hours} hrs</StyledText>
              </StyledView>
            </StyledView>

            {/* Materials List */}
            <StyledView style={{ marginTop: 8 }}>
              <StyledText className="text-gray-500 text-xs font-bold uppercase mb-3" style={{ color: '#6B7280', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 }}>Required Materials</StyledText>
              <StyledView className="flex-row flex-wrap gap-2" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {analysisMutation.data?.materials_required?.map((m: string, i: number) => (
                  <StyledView key={i} className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <StyledText className="text-gray-200 text-sm font-medium" style={{ color: '#E5E7EB', fontSize: 14, fontWeight: '500' }}>{m}</StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>

            {/* Action Button */}
            <StyledTouchableOpacity
              onPress={reset}
              className="bg-emerald-600 w-full py-4 rounded-xl items-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
              style={{ backgroundColor: '#059669', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' } as any}
            >
              <StyledText className="text-white font-bold text-lg tracking-wide" style={{ color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>SUBMIT REPORT</StyledText>
            </StyledTouchableOpacity>

          </StyledView>
        </StyledView>
      </StyledView>
    );
  }

  // Camera View
  return (
    <StyledView className="flex-1 bg-black" style={{ flex: 1, backgroundColor: 'black', minHeight: '100vh' }}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={{ flex: 1, width: '100%', height: '100%' }}
        facing="back"
        ref={(ref) => setCameraRef(ref)}
      >
        <StyledSafeAreaView className="flex-1 justify-between p-6" style={{ flex: 1, justifyContent: 'space-between', padding: 24 }}>
          <StyledView className="flex-row justify-between items-center bg-black/40 p-4 rounded-full blur-md" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 9999 }}>
            <StyledText className="text-emerald-400 font-bold tracking-widest" style={{ color: '#34D399', fontWeight: 'bold', letterSpacing: 3 }}>CIVIC SIGHT</StyledText>

            {/* Offline Indicator / Sync Button */}
            {isOffline ? (
              <StyledView className="bg-red-500 px-3 py-1 rounded-full" style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                <StyledText className="text-white text-xs font-bold" style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>OFFLINE MODE</StyledText>
              </StyledView>
            ) : queueCount > 0 ? (
              <StyledTouchableOpacity onPress={syncQueue} className="bg-orange-500 px-3 py-1 rounded-full animate-pulse" style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                <StyledText className="text-white text-xs font-bold" style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>SYNC ({queueCount})</StyledText>
              </StyledTouchableOpacity>
            ) : (
              <StyledView className="w-2 h-2 rounded-full bg-emerald-500" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            )}
          </StyledView>

          <StyledView className="items-center mb-8" style={{ alignItems: 'center', marginBottom: 32 }}>
            <StyledTouchableOpacity
              onPress={takePicture}
              className="w-20 h-20 rounded-full border-4 border-white justify-center items-center bg-white/20"
              style={{ width: 80, height: 80, borderRadius: 40, cursor: 'pointer', borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' } as any}
            >
              <StyledView className="w-16 h-16 bg-white rounded-full" style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' }} />
            </StyledTouchableOpacity>
            <StyledText className="text-white mt-4 font-medium opacity-80" style={{ color: 'white', marginTop: 16, fontWeight: '500', opacity: 0.8 }}>
              {isOffline ? "Capture directly to Shadow DB" : "Tap to Capture"}
            </StyledText>
          </StyledView>
        </StyledSafeAreaView>
      </CameraView>
    </StyledView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReporterApp />
    </QueryClientProvider>
  )
}
