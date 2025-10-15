# 🔐 Secure Deployment Guide - Cloudflare Pages

This guide will help you deploy your LiveChat application securely to Cloudflare Pages with the Hugging Face API key protected.

## ✅ What Changed

### Security Improvements
- **API Key Protection**: The Hugging Face API key is no longer exposed in client-side JavaScript
- **Serverless Function**: A new Cloudflare Pages Function (`/functions/ai.js`) acts as a secure proxy
- **Environment Variables**: API key is stored securely in Cloudflare's environment variables

### Bug Fixes
- **Admin Dashboard**: Fixed "loadChats is not a function" error when blocking/unblocking users
- **Duplicate Function**: Removed duplicate `refreshChats()` function that was causing conflicts

## 📋 Deployment Steps

### 1. Commit Your Changes

```bash
cd "/Users/harrydearden/Desktop/XCode Apps/LiveChat"

# Add all changes
git add functions/ai.js client/script.js admin/script.js

# Commit with a descriptive message
git commit -m "Add secure Cloudflare Function for Hugging Face API and fix admin dashboard errors"

# Push to your repository
git push origin main
```

### 2. Set Up Environment Variable in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Pages** → **[Your LiveChat Project]** → **Settings** → **Environment Variables**
3. Click **"Add variable"**
4. Add the following:
   - **Variable name**: `HF_API_KEY`
   - **Value**: `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` (or your new token)
   - **Environment**: Select both **Production** and **Preview**
5. Click **"Save"**

### 3. Redeploy Your Site

After setting the environment variable:

1. Go to: **Pages** → **[Your LiveChat Project]** → **Deployments**
2. Click **"Retry deployment"** on the latest deployment, OR
3. The site will automatically redeploy when you push new commits

### 4. Verify the Deployment

Once deployed, your application will:
- Call `/ai` endpoint instead of directly calling Hugging Face
- The Cloudflare Function will securely proxy the request
- API key remains hidden on the server

## 🔒 Security Best Practices

### Update Your API Key (Recommended)

Since your old API key was exposed in the repository, it's recommended to:

1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. **Revoke** the old token: `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`
3. **Create a new token**
4. Update the `HF_API_KEY` environment variable in Cloudflare with the new token

### CORS Configuration (Optional)

If you want to restrict API access to your domain only, update `/functions/ai.js`:

```javascript
// Replace this line:
"Access-Control-Allow-Origin": "*"

// With your specific domain:
"Access-Control-Allow-Origin": "https://yourdomain.com"
```

## 🧪 Testing

### Test the API Endpoint

You can test the secure endpoint using curl:

```bash
curl -X POST https://yourdomain.com/ai \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-V3.1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

### Test Admin Dashboard

1. Log in to the admin dashboard
2. Try blocking a user - should work without errors
3. Go to "Blocked Users" and try unblocking - should work without errors
4. No "loadChats is not a function" error should appear

## 📁 File Changes Summary

### New Files
- `functions/ai.js` - Cloudflare Pages Function for secure API proxy

### Modified Files
- `client/script.js`:
  - Removed exposed API key
  - Updated `generateChatName()` to use `/ai` endpoint
  - Updated `getAIResponse()` to use `/ai` endpoint

- `admin/script.js`:
  - Fixed duplicate `refreshChats()` function
  - Made `refreshChats()` return a Promise for proper async/await handling
  - Resolved "loadChats is not a function" error

## 🎉 Benefits

✅ **Security**: API key is never exposed to clients  
✅ **Reliability**: Admin dashboard blocking/unblocking works without false errors  
✅ **Maintainability**: Single source of truth for API configuration  
✅ **Cost Control**: Rate limiting can be added at the function level  
✅ **Monitoring**: Function logs available in Cloudflare dashboard  

## 🆘 Troubleshooting

### Issue: "AI not responding"
- Check Cloudflare Functions logs
- Verify `HF_API_KEY` is set correctly
- Ensure you've redeployed after adding the environment variable

### Issue: "CORS errors"
- Make sure the `Access-Control-Allow-Origin` headers are configured in `functions/ai.js`
- Check browser console for specific CORS error messages

### Issue: "Admin dashboard still showing errors"
- Clear browser cache
- Force refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check browser console for any remaining JavaScript errors

## 📞 Support

If you encounter any issues:
1. Check Cloudflare Pages deployment logs
2. Check browser console for client-side errors
3. Verify all environment variables are set correctly

---

**Last Updated**: October 15, 2025
