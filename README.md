# BookLink

BookLink is a community app for listing books and arranging **in-person exchanges**: browse listings, send exchange requests, chat with listers, manage a wishlist, leave reviews, and report issues. The product is a **React Native (Expo)** client with an **Express** API backed by **MongoDB**, using **Clerk** for authentication.

## Repository layout

| Folder     | Role |
| ---------- | ---- |
| `Frontend` | Expo app (iOS, Android, Web). Tab navigation, book browse/detail, requests & chat, wishlist, profile. |
| `Backend`  | REST API under `/api/*`, JWT validation via Clerk, Cloudinary for uploads where configured. |

## Tech stack

- **Frontend:** Expo ~54, React Navigation, TypeScript, Clerk Expo SDK, Axios.
- **Backend:** Node.js (ES modules), Express 5, Mongoose, `@clerk/express`, optional Cloudinary.

## Documentation

- **[How to run the project](./HOW_TO_RUN.md)** — install dependencies, environment variables, local dev, and common pitfalls.

## License

Private project (`Frontend` and `Backend` are marked `private` in their `package.json` files). Adjust as needed for your distribution.
