import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    Image, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert,
    Dimensions
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { createAuthAxios } from '../../api/axios';

const { width } = Dimensions.get('window');

const BookDetailScreen = ({ route, navigation }) => {
    const { book: initialBook } = route.params;
    const { getToken } = useAuth();
    const [book, setBook] = useState(initialBook);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const authAxios = createAuthAxios(getToken);
            
            // Fetch fresh book data
            const bookRes = await authAxios.get(`/api/books/${initialBook._id}`);
            setBook(bookRes.data);

            // Fetch current user details to check ownership
            const userRes = await authAxios.get('/api/users/me');
            setCurrentUser(userRes.data);
        } catch (error) {
            console.error('Error fetching detail data:', error);
            Alert.alert('Error', 'Unable to load book details');
        } finally {
            setLoading(false);
        }
    }, [initialBook._id, getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        Alert.alert(
            'Delete Book',
            'Are you sure you want to remove this listing? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const authAxios = createAuthAxios(getToken);
                            await authAxios.delete(`/api/books/${book._id}`);
                            Alert.alert('Success', 'Book deleted successfully');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to delete book');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    const isOwner = currentUser?._id === book.postedBy?._id;

    return (
        <ScrollView style={styles.container}>
            <Image 
                source={{ uri: book.coverImage || 'https://via.placeholder.com/300' }} 
                style={styles.coverImage} 
            />
            
            <View style={styles.content}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.author}>by {book.author}</Text>
                
                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeTxt}>{book.condition}</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeTxt}>{book.language}</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeTxt}>{book.grade}</Text></View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <Text style={styles.label}>Subject:</Text>
                    <Text style={styles.value}>{book.subject}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.label}>Year:</Text>
                    <Text style={styles.value}>{book.year}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.label}>Exchange Status:</Text>
                    <Text style={[styles.value, { color: book.status === 'Available' ? '#4CAF50' : '#f44336' }]}>
                        {book.status}
                    </Text>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity 
                    style={styles.userSection}
                    onPress={() => navigation.navigate('UserReviews', { userId: book.postedBy?._id })}
                >
                    <View>
                        <Text style={styles.postedByLabel}>Posted By</Text>
                        <Text style={styles.posterName}>{book.postedBy?.name}</Text>
                        <Text style={styles.posterUni}>{book.postedBy?.university}</Text>
                    </View>
                    <Text style={styles.linkText}>View Profile</Text>
                </TouchableOpacity>

                <View style={styles.actionSection}>
                    {isOwner ? (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                            <Text style={styles.btnText}>Delete Listing</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.requestBtn}
                            disabled={book.status !== 'Available'}
                            onPress={() => navigation.navigate('SendRequest', { 
                                bookId: book._id, 
                                ownerId: book.postedBy?._id,
                                bookTitle: book.title
                            })}
                        >
                            <Text style={styles.btnText}>
                                {book.status === 'Available' ? 'Request Exchange' : 'Already Exchanged'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coverImage: { width: width, height: 300, resizeMode: 'cover' },
    content: { padding: 20 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
    author: { fontSize: 18, color: '#666', marginTop: 4 },
    badgeRow: { flexDirection: 'row', marginTop: 15 },
    badge: { 
        backgroundColor: '#f0f0f0', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20, 
        marginRight: 10 
    },
    badgeTxt: { fontSize: 12, color: '#555', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { fontSize: 16, color: '#888' },
    value: { fontSize: 16, color: '#333', fontWeight: '500' },
    userSection: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#F9F9F9',
        borderRadius: 10
    },
    postedByLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
    posterName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 2 },
    posterUni: { fontSize: 13, color: '#666' },
    linkText: { color: '#4CAF50', fontWeight: 'bold' },
    actionSection: { marginTop: 30, marginBottom: 40 },
    requestBtn: { 
        backgroundColor: '#4CAF50', 
        paddingVertical: 15, 
        borderRadius: 30, 
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6
    },
    deleteBtn: { backgroundColor: '#F44336', paddingVertical: 15, borderRadius: 30, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default BookDetailScreen;
