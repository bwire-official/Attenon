// Test script to verify API connection
import { API_CONFIG } from './src/lib/config';

console.log('=== API Configuration Test ===');
console.log('Face API URL:', API_CONFIG.FACE_API_URL);
console.log('Supabase URL:', API_CONFIG.SUPABASE_URL);

// Test API health
async function testAPI() {
    try {
        console.log('\nTesting API connection...');
        const response = await fetch(`${API_CONFIG.FACE_API_URL}/`, {
            method: 'GET',
        });

        const data = await response.json();
        console.log('✅ API Response:', data);
        console.log('Status:', response.status);
    } catch (error) {
        console.error('❌ API Connection Failed:', error);
    }
}

testAPI();
