import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    StyleSheet, 
    Alert, 
    ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@clerk/clerk-expo';
import { createAuthAxios } from '../../api/axios';

const conditions = ['New', 'Good', 'Fair', 'Poor'];
const languages = ['Sinhala', 'Tamil', 'English'];

const AddBookScreen = ({ navigation }) => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        subject: '',
        grade: '',
        year: '',
        condition: 'Good',
        language: 'Sinhala',
    });
    const [image, setImage] = useState(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    const handlePost = async () => {
        if (!formData.title || !formData.author) {
            Alert.alert('Missing Fields', 'Title and Author are required');
            return;
        }

        setLoading(true);
        try {
            const authAxios = createAuthAxios(getToken);
            const data = new FormData();
            
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            if (image) {
                const filename = image.uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                
                data.append('coverImage', {
                    uri: image.uri,
                    name: filename,
                    type,
                });
            }

            await authAxios.post('/api/books', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Success', 'Book posted successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('BrowseBooks') }
            ]);
        } catch (error) {
            console.error('Post Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to post book');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.header}>Post a New Book</Text>
            
            <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
                {image ? (
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.cameraIcon}>📸</Text>
                        <Text style={styles.placeholderText}>Select Cover Image</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.form}>
                <Text style={styles.label}>Title *</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Book Title" 
                    value={formData.title}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, title: val }))}
                />

                <Text style={styles.label}>Author *</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Author Name" 
                    value={formData.author}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, author: val }))}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>Subject</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Maths" 
                            value={formData.subject}
                            onChangeText={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                        />
                    </View>
                    <View style={{ width: 100 }}>
                        <Text style={styles.label}>Grade</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 11" 
                            value={formData.grade}
                            onChangeText={(val) => setFormData(prev => ({ ...prev, grade: val }))}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Year</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. 2023" 
                    keyboardType="numeric"
                    value={formData.year}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, year: val }))}
                />

                <Text style={styles.label}>Condition</Text>
                <View style={styles.selectorRow}>
                    {conditions.map(c => (
                        <TouchableOpacity 
                            key={c} 
                            style={[styles.selector, formData.condition === c && styles.activeSelector]}
                            onPress={() => setFormData(prev => ({ ...prev, condition: c }))}
                        >
                            <Text style={[styles.selectorText, formData.condition === c && styles.activeSelectorText]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Language</Text>
                <View style={styles.selectorRow}>
                    {languages.map(l => (
                        <TouchableOpacity 
                            key={l} 
                            style={[styles.selector, formData.language === l && styles.activeSelector]}
                            onPress={() => setFormData(prev => ({ ...prev, language: l }))}
                        >
                            <Text style={[styles.selectorText, formData.language === l && styles.activeSelectorText]}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={handlePost}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Post Book</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    imageBox: {
        width: '100%',
        height: 200,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 20
    },
    previewImage: { width: '100%', height: '100%' },
    imagePlaceholder: { alignItems: 'center' },
    cameraIcon: { fontSize: 40, marginBottom: 10 },
    placeholderText: { color: '#888', fontSize: 16 },
    form: { marginTop: 10 },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 15 },
    input: { 
        height: 50, 
        borderWidth: 1, 
        borderColor: '#eee', 
        borderRadius: 10, 
        paddingHorizontal: 15, 
        backgroundColor: '#F7F7F7',
        fontSize: 16
    },
    row: { flexDirection: 'row' },
    selectorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    selector: { 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 20, 
        borderWidth: 1, 
        borderColor: '#4CAF50', 
        marginRight: 10, 
        marginBottom: 10 
    },
    activeSelector: { backgroundColor: '#4CAF50' },
    selectorText: { color: '#4CAF50', fontWeight: 'bold' },
    activeSelectorText: { color: '#fff' },
    submitBtn: { 
        backgroundColor: '#4CAF50', 
        height: 60, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 50,
        elevation: 4
    },
    submitBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' }
});

export default AddBookScreen;
