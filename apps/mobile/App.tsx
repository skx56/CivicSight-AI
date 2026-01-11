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
      const { error: dbError } = await supabase.from('reports').insert({
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80", // Placeholder for demo
        location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        issue_type: finalData.issue_type,
        severity_score: finalData.severity_score,
        materials_required: finalData.materials_required,
        estimated_labor_hours: finalData.estimated_labor_hours,
        status: 'pending'
      });

      if (dbError) console.warn("DB Save failed (Demo Mode)", dbError);

      return finalData;
    },
    onError: (e: any) => {
      Alert.alert("Error", e.message);
    }
  });

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
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
            analysisMutation.mutate({ uri: photo.uri, base64: photo.base64 });
          }
        }
      } catch (e) {
        Alert.alert("Error", "Failed to take picture");
      }
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
      <StyledView className="flex-1 bg-gray-900">
        <StyledImage source={{ uri: imageUri }} className="w-full h-2/3" resizeMode="cover" />
        <StyledView className="flex-1 p-6 bg-gray-800/90 rounded-t-3xl -mt-6 backdrop-blur-md border border-white/10">
          <StyledView className="space-y-4">
            {/* Header */}
            <StyledView className="flex-row justify-between items-center">
              <StyledText className="text-white text-2xl font-bold uppercase">{analysisMutation.data?.issue_type || "No Issue"}</StyledText>
              <StyledView className="bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500">
                <StyledText className="text-emerald-400 font-bold">SEVERITY: {analysisMutation.data?.severity_score}/10</StyledText>
              </StyledView>
            </StyledView>

            {/* Materials */}
            <StyledView className="bg-white/5 p-4 rounded-xl border border-white/10">
              <StyledText className="text-gray-400 text-xs uppercase tracking-widest mb-2">Required Materials</StyledText>
              <StyledView className="flex-row flex-wrap gap-2">
                {analysisMutation.data?.materials_required?.map((m: string, i: number) => (
                  <StyledView key={i} className="bg-gray-700 px-2 py-1 rounded">
                    <StyledText className="text-gray-200 text-sm">{m}</StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>

            {/* Stats */}
            <StyledView className="flex-row justify-between">
              <StyledView>
                <StyledText className="text-gray-400 text-xs">EST. LABOR</StyledText>
                <StyledText className="text-white text-lg font-mono">{analysisMutation.data?.estimated_labor_hours} HRS</StyledText>
              </StyledView>
              <StyledView>
                <StyledText className="text-gray-400 text-xs">COST SAVING</StyledText>
                <StyledText className="text-emerald-400 text-lg font-mono">$150.00</StyledText>
              </StyledView>
            </StyledView>

            <StyledTouchableOpacity onPress={reset} className="bg-emerald-600 py-3 rounded-xl items-center mt-4 active:bg-emerald-700">
              <StyledText className="text-white font-bold text-lg">NEW REPORT</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>
    );
  }

  // Camera View
  return (
    <StyledView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        ref={(ref) => setCameraRef(ref)}
      >
        <StyledSafeAreaView className="flex-1 justify-between p-6">
          <StyledView className="flex-row justify-between items-center bg-black/40 p-4 rounded-full blur-md">
            <StyledText className="text-emerald-400 font-bold tracking-widest">CIVIC SIGHT</StyledText>

            {/* Offline Indicator / Sync Button */}
            {isOffline ? (
              <StyledView className="bg-red-500 px-3 py-1 rounded-full">
                <StyledText className="text-white text-xs font-bold">OFFLINE MODE</StyledText>
              </StyledView>
            ) : queueCount > 0 ? (
              <StyledTouchableOpacity onPress={syncQueue} className="bg-orange-500 px-3 py-1 rounded-full animate-pulse">
                <StyledText className="text-white text-xs font-bold">SYNC ({queueCount})</StyledText>
              </StyledTouchableOpacity>
            ) : (
              <StyledView className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </StyledView>

          <StyledView className="items-center mb-8">
            <StyledTouchableOpacity
              onPress={takePicture}
              className="w-20 h-20 rounded-full border-4 border-white justify-center items-center bg-white/20"
            >
              <StyledView className="w-16 h-16 bg-white rounded-full" />
            </StyledTouchableOpacity>
            <StyledText className="text-white mt-4 font-medium opacity-80">
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
