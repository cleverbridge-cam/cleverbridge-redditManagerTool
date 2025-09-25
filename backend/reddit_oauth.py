from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from authlib.integrations.starlette_client import OAuth
import os
from supabase import create_client, Client

router = APIRouter()

# Reddit OAuth config
OAUTH_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
OAUTH_REDIRECT_URI = os.getenv("REDDIT_REDIRECT_URI", "http://localhost:8000/auth/callback")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

oauth = OAuth()
oauth.register(
    name='reddit',
    client_id=OAUTH_CLIENT_ID,
    client_secret=OAUTH_CLIENT_SECRET,
    access_token_url='https://www.reddit.com/api/v1/access_token',
    authorize_url='https://www.reddit.com/api/v1/authorize',
    api_base_url='https://oauth.reddit.com/api/v1/',
    client_kwargs={
        'scope': 'identity',
        'token_endpoint_auth_method': 'client_secret_basic',
    },
)

@router.get('/auth/login')
async def login(request: Request):
    redirect_uri = OAUTH_REDIRECT_URI
    return await oauth.reddit.authorize_redirect(request, redirect_uri)

@router.get('/auth/callback')
async def auth_callback(request: Request):
    token = await oauth.reddit.authorize_access_token(request)
    user_response = await oauth.reddit.get('me', token=token)
    user_info = user_response.json()
    # Fetch karma and total posts
    karma = user_info.get("total_karma", 0)
    # Fetch total posts
    posts_response = await oauth.reddit.get(f"user/{user_info.get('name')}/submitted", token=token)
    posts_data = posts_response.json()
    total_posts = len(posts_data.get("data", {}).get("children", []))
    # Store user info, karma, and total_posts in Supabase
    # NOTE: No refresh tokens stored for security - users re-authenticate as needed
    supabase.table("reddit_accounts").upsert({
        "username": user_info.get("name"),
        "access_token": token.get("access_token"),  # Short-lived only
        # Refresh token deliberately omitted for security
        "token_type": token.get("token_type"),
        "expires_in": token.get("expires_in"),
        "scope": token.get("scope"),
        "status": "active",
        "karma": karma,
        "total_posts": total_posts,
        "last_connected": "now()"  # Track when user last connected
    }).execute()
    html_content = """
    <html>
      <head>
        <title>Reddit Account Connected</title>
        <script>
          setTimeout(function() { window.close(); }, 2000);
        </script>
      </head>
      <body style='font-family:sans-serif;text-align:center;padding-top:50px;'>
        <h2>Reddit account connected successfully!</h2>
        <p>You can close this window.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@router.get('/accounts')
def list_accounts():
    result = supabase.table("reddit_accounts").select("id", "username", "created_at", "status").execute()
    return result.data

@router.delete('/accounts/{account_id}')
def delete_account(account_id: int):
    supabase.table("reddit_accounts").delete().eq("id", account_id).execute()
    return {"success": True}

@router.post('/accounts/{account_id}/status')
async def update_account_status(account_id: int, request: Request):
    data = await request.json()
    new_status = data.get("status")
    if new_status not in ["active", "paused", "cooldown", "flagged"]:
        return {"success": False, "error": "Invalid status"}
    supabase.table("reddit_accounts").update({"status": new_status}).eq("id", account_id).execute()
    return {"success": True, "status": new_status}

@router.post('/accounts/{account_id}/refresh_stats')
async def refresh_account_stats(account_id: int):
    # Get account info from Supabase
    result = supabase.table("reddit_accounts").select("username", "access_token").eq("id", account_id).execute()
    if not result.data or len(result.data) == 0:
        return {"success": False, "error": "Account not found"}
    account = result.data[0]
    username = account.get("username")
    access_token = account.get("access_token")
    if not username or not access_token:
        return {"success": False, "error": "Missing username or access token"}
    # Fetch latest karma
    oauth_client = oauth.reddit
    user_response = await oauth_client.get('me', token={"access_token": access_token, "token_type": "bearer"})
    user_info = user_response.json()
    karma = user_info.get("total_karma", 0)
    # Fetch latest total posts
    posts_response = await oauth_client.get(f"user/{username}/submitted", token={"access_token": access_token, "token_type": "bearer"})
    posts_data = posts_response.json()
    total_posts = len(posts_data.get("data", {}).get("children", []))
    # Update Supabase
    supabase.table("reddit_accounts").update({"karma": karma, "total_posts": total_posts}).eq("id", account_id).execute()
    return {"success": True, "karma": karma, "total_posts": total_posts}
