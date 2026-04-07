import Book from './book.model.js';
import User from '../users/user.model.js';
import { getUserId } from '../../middleware/auth.js';

export const createBook = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User profile not found. Please sync your profile first.' });
        }

        const { title, author, subject, grade, year, condition, language } = req.body;
        const coverImage = req.file ? req.file.path : '';

        const newBook = new Book({
            title,
            author,
            subject,
            grade,
            year,
            condition,
            language,
            coverImage,
            postedBy: user._id,
        });

        const savedBook = await newBook.save();
        return res.status(201).json(savedBook);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getAllBooks = async (req, res) => {
    try {
        const filter = {};
        if (req.query.subject) filter.subject = req.query.subject;
        if (req.query.grade) filter.grade = req.query.grade;
        if (req.query.condition) filter.condition = req.query.condition;
        if (req.query.language) filter.language = req.query.language;
        if (req.query.status) filter.status = req.query.status;

        const books = await Book.find(filter)
            .populate('postedBy', 'name university city')
            .sort({ createdAt: -1 });

        return res.status(200).json(books);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getSingleBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('postedBy', 'name university city email');

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        return res.status(200).json(book);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteBook = async (req, res) => {
    try {
        const clerkId = getUserId(req);
        const user = await User.findOne({ clerkId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.postedBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this book' });
        }

        await book.deleteOne();
        return res.status(200).json({ message: 'Book deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
