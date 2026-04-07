import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth, useAuth } from '@clerk/clerk-expo';
import axios from '../../api/axios';

WebBrowser.maybeCompleteAuthSession();

const SignInScreen = () => {
    const [loading, setLoading] = useState(false);
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
    const { isLoaded } = useAuth();

    const handleGoogleSignIn = async () => {
        if (!isLoaded) return;
        setLoading(true);
        try {
            const { createdSessionId, setActive } = await startOAuthFlow();

            if (createdSessionId) {
                await setActive({ session: createdSessionId });
                
                // Sync user with backend (optional but recommended in prompt)
                // Note: We don't have name/email easily here without extra steps, 
                // but we can try to hit the sync endpoint which usually extracts it from the JWT in the backend.
                try {
                    await axios.post('/api/users/sync');
                } catch (syncError) {
                    console.log('User sync failed (silent capture):', syncError.message);
                }
            } else {
                console.log('Google Sign-In failed: No session created.');
            }
        } catch (err) {
            console.error('OAuth error', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>BookLink</Text>
                <Text style={styles.subtitle}>Exchange books. Build connections.</Text>
            </View>

            <View style={styles.spacer} />

            {loading ? (
                <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
                    <Text style={styles.buttonText}>Sign in with Google</Text>
                </TouchableOpacity>
            )}

            <View style={styles.spacer} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 10,
    },
    spacer: {
        height: 100,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        width: '80%',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default SignInScreen;
