# Firebase Authentication Setup

## Enable Email/Password Authentication

To fix the 400 error when logging in with email/password, you need to enable Email/Password authentication in Firebase Console:

### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **spontaneous-travel-app**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable the toggle for **Email/Password**
6. Click **Save**

### Additional Settings:

- **Email link (passwordless sign-in)**: Optional - can be enabled if needed
- **Authorized domains**: Make sure `localhost` is in the list for development

### Verify Setup:

After enabling Email/Password:
- The error should be resolved
- Users can register and login with email/password
- Google Auth will continue to work as before

## Common Error Messages:

- **"Email/password authentication is not enabled"**: Enable Email/Password in Firebase Console
- **"Invalid email or password"**: Check credentials or try registering first
- **"This email is already registered"**: Use login instead of register
- **"No account found with this email"**: Register first or use correct email

