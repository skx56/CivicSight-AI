import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

export const QUEUE_KEY = 'offline_reports_queue';

export interface PendingReport {
    id: string;
    uri: string;
    base64: string;
    timestamp: number;
}

export const OfflineQueue = {
    async addItem(item: PendingReport) {
        try {
            const current = await this.getItems();
            current.push(item);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(current));
            return true;
        } catch (e) {
            console.error("Queue Error", e);
            return false;
        }
    },

    async getItems(): Promise<PendingReport[]> {
        try {
            const json = await AsyncStorage.getItem(QUEUE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    },

    async removeItem(id: string) {
        try {
            const current = await this.getItems();
            const filtered = current.filter(i => i.id !== id);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error("Remove Error", e);
        }
    },

    async clear() {
        await AsyncStorage.removeItem(QUEUE_KEY);
    },

    async isConnected() {
        const status = await Network.getNetworkStateAsync();
        return status.isConnected && status.isInternetReachable;
    }
};
