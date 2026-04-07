import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator, 
    RefreshControl, 
    StyleSheet,
    Alert
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { createAuthAxios } from '../../api/axios';

const MyListingsScreen = ({ navigation }) => {
    const { getToken } = useAuth();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMyBooks = useCallback(async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const authAxios = createAuthAxios(getToken);
            
            // Fetch current user first to get their MongoDB ID
            const userRes = await authAxios.get('/api/users/me');
            const currentUser = userRes.data;

            // Fetch all books (ideally the backend should have a /my endpoint or support filtering by postedBy)
            // But for now we fetch all and filter client side as requested.
            const response = await authAxios.get('/api/books');
            const myBooks = response.data.filter(b => b.postedBy?._id === currentUser._id);
            
            setBooks(myBooks);
        } catch (error) {
            console.error('Error fetching my books:', error);
            Alert.alert('Error', 'Failed to load your listings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchMyBooks();
    }, [fetchMyBooks]);

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Listing',
            'Are you sure you want to delete this book?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const authAxios = createAuthAxios(getToken);
                            await authAxios.delete(`/api/books/${id}`);
                            setBooks(prev => prev.filter(b => b._id !== id));
                            Alert.alert('Success', 'Listing removed');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete listing');
                        }
                    }
                }
            ]
        );
    };

    const renderBookItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.bookCard} 
            onPress={() => navigation.navigate('BookDetail', { book: item })}
        >
            <Image 
                source={{ uri: item.coverImage || 'https://via.placeholder.com/150' }} 
                style={styles.bookImage} 
            />
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.statusText}>{item.status}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.conditionText}>{item.condition}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.deleteIcon} onPress={() => handleDelete(item._id)}>
                <Text style={styles.deleteIconTxt}>🗑️</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Book Listings</Text>
                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddBook')}
                >
                    <Text style={styles.addBtnText}>+ Add New</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <FlatList
                    data={books}
                    keyExtractor={item => item._id}
                    renderItem={renderBookItem}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>You haven't posted any books yet.</Text>
                            <TouchableOpacity 
                                style={styles.emptyAddBtn}
                                onPress={() => navigation.navigate('AddBook')}
                            >
                                <Text style={styles.emptyAddBtnText}>Post your first book</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchMyBooks(true)} />
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        backgroundColor: '#fff', 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    listContent: { padding: 15 },
    bookCard: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        borderRadius: 12, 
        padding: 10,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    bookImage: { width: 60, height: 80, borderRadius: 6 },
    bookInfo: { flex: 1, marginLeft: 15 },
    bookTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    bookAuthor: { fontSize: 13, color: '#666', marginTop: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    statusText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },
    conditionText: { fontSize: 12, color: '#888' },
    dot: { marginHorizontal: 5, color: '#DDD' },
    deleteIcon: { padding: 10 },
    deleteIconTxt: { fontSize: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#888', textAlign: 'center' },
    emptyAddBtn: { marginTop: 20, backgroundColor: '#4CAF50', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    emptyAddBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default MyListingsScreen;
