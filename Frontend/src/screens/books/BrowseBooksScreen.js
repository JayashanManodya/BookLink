import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator, 
    RefreshControl, 
    ScrollView, 
    StyleSheet 
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { createAuthAxios } from '../../api/axios';

const subjects = ['All', 'Maths', 'Science', 'ICT', 'English', 'Other'];
const conditions = ['All', 'New', 'Good', 'Fair', 'Poor'];

const BrowseBooksScreen = ({ navigation }) => {
    const { getToken } = useAuth();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        subject: 'All',
        condition: 'All',
    });

    const fetchBooks = useCallback(async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const authAxios = createAuthAxios(getToken);
            let query = '';
            if (activeFilters.subject !== 'All') query += `subject=${activeFilters.subject}&`;
            if (activeFilters.condition !== 'All') query += `condition=${activeFilters.condition}&`;
            
            const response = await authAxios.get(`/api/books?${query}`);
            setBooks(response.data);
        } catch (error) {
            console.error('Error fetching books:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilters, getToken]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Explore Books</Text>
            
            <Text style={styles.filterLabel}>Subjects</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {subjects.map(subject => (
                    <TouchableOpacity 
                        key={subject} 
                        style={[
                            styles.pill, 
                            activeFilters.subject === subject ? styles.activePill : styles.inactivePill
                        ]}
                        onPress={() => setActiveFilters(prev => ({ ...prev, subject }))}
                    >
                        <Text style={activeFilters.subject === subject ? styles.activePillText : styles.inactivePillText}>
                            {subject}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {conditions.map(cond => (
                    <TouchableOpacity 
                        key={cond} 
                        style={[
                            styles.pill, 
                            activeFilters.condition === cond ? styles.activePill : styles.inactivePill
                        ]}
                        onPress={() => setActiveFilters(prev => ({ ...prev, condition: cond }))}
                    >
                        <Text style={activeFilters.condition === cond ? styles.activePillText : styles.inactivePillText}>
                            {cond}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const getConditionStyle = (condition) => {
        switch (condition) {
            case 'New': return { backgroundColor: '#4CAF50' };
            case 'Good': return { backgroundColor: '#2196F3' };
            case 'Fair': return { backgroundColor: '#FFC107' };
            case 'Poor': return { backgroundColor: '#F44336' };
            default: return { backgroundColor: '#888' };
        }
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
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                <View style={[styles.badge, getConditionStyle(item.condition)]}>
                    <Text style={styles.badgeText}>{item.condition}</Text>
                </View>
                <Text style={styles.bookSubject}>{item.subject} • {item.grade}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <FlatList
                    data={books}
                    keyExtractor={item => item._id}
                    renderItem={renderBookItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No books found</Text>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchBooks(true)} />
                    }
                    contentContainerStyle={styles.listContainer}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('AddBook')}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { paddingBottom: 100 },
    headerContainer: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
    filterLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 10, marginBottom: 5 },
    filterRow: { flexDirection: 'row', marginBottom: 5 },
    pill: { 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 20, 
        marginRight: 10, 
        borderWidth: 1 
    },
    activePill: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    inactivePill: { backgroundColor: '#fff', borderColor: '#4CAF50' },
    activePillText: { color: '#fff', fontWeight: 'bold' },
    inactivePillText: { color: '#4CAF50' },
    bookCard: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        marginHorizontal: 15, 
        marginTop: 15, 
        borderRadius: 10, 
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    bookImage: { width: 100, height: 120 },
    bookInfo: { flex: 1, padding: 12 },
    bookTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    bookAuthor: { fontSize: 14, color: '#666', marginTop: 2 },
    bookSubject: { fontSize: 12, color: '#888', marginTop: 5 },
    badge: { 
        alignSelf: 'flex-start', 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 5, 
        marginTop: 8 
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },
    fab: { 
        position: 'absolute', 
        bottom: 25, 
        right: 25, 
        backgroundColor: '#4CAF50', 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabIcon: { color: '#fff', fontSize: 30, fontWeight: 'bold' }
});

export default BrowseBooksScreen;
