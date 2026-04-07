<<<<<<< Updated upstream
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth, useAuth } from '@clerk/clerk-expo';
import axios from '../../api/axios';
=======
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useOAuth, useAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import api from '../../api/axios';
>>>>>>> Stashed changes

WebBrowser.maybeCompleteAuthSession();

const SignInScreen = () => {
<<<<<<< Updated upstream
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
=======
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow();

        if (createdSessionId) {
          await setActive({ session: createdSessionId });

          // Sync with our backend using the new session token
          try {
            const token = await getToken();
            const email = signUp?.emailAddress || signIn?.identifier || "";
            const name = `${signUp?.firstName || ""} ${signUp?.lastName || ""}`.trim() || "User";

            await api.post('/api/users/sync', { name, email }, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (syncErr) {
            console.error('User sync error', syncErr);
            // We don't necessarily want to block the user if sync fails once,
            // as it will sync eventually or can be retried on next login.
          }
        }
      } catch (err) {
        console.error('OAuth error', err);
        Alert.alert('Sign In Failed', 'Could not complete Google Sign In.');
      } finally {
        setLoading(false);
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BookLink</Text>
      <Text style={styles.tagline}>Exchange books. Build connections.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
          <Text style={styles.buttonText}>Sign In with Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
>>>>>>> Stashed changes
});

export default SignInScreen;
