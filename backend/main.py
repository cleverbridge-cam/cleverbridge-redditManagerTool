from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from supabase import create_client, Client
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv
from functools import lru_cache
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()
# Try relative imports first (for local development), fall back to absolute (for Railway)
try:
    from .reddit_utils import get_recent_mentions
    from .sentiment_analysis import analyze_sentiment
    from .reddit_oauth import router as reddit_oauth_router
except ImportError:
    from reddit_utils import get_recent_mentions
    from sentiment_analysis import analyze_sentiment
    from reddit_oauth import router as reddit_oauth_router

app = FastAPI()

# Allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development (Vite default)
        "http://localhost:8081",  # Local development (current frontend port)
        "http://localhost:8080",
        "https://reddit-sentiment-managerfrontend-production.up.railway.app",  # Railway deployment
        "https://cleverbridge.reddit.manager.com"  # Custom domain (when SSL is fixed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cache for optimizing repeated queries
@lru_cache(maxsize=32)
def get_cached_subreddits():
    """Cache subreddits for 5 minutes"""
    result = supabase.table("monitored_subreddits").select("name").execute()
    return [row["name"] for row in result.data] if result.data else []

@lru_cache(maxsize=32)
def get_cached_keywords():
    """Cache keywords for 5 minutes"""
    keywords_result = supabase.table("keywords").select("name").execute()
    return [row["name"] for row in keywords_result.data] if keywords_result.data else ["Cleverbridge", "Merchant of Record", "MoR", "scaling"]

# Add cache invalidation endpoint
@app.post("/cache/clear")
def clear_cache():
    """Clear the cache when data is updated"""
    get_cached_subreddits.cache_clear()
    get_cached_keywords.cache_clear()
    return {"message": "Cache cleared"}

# Configuration endpoint for frontend authentication
@app.get("/api/config")
def get_frontend_config():
    """Provide frontend configuration including auth credentials"""
    return {
        "auth": {
            "username": os.getenv("AUTH_USERNAME", "admin"),
            "password": os.getenv("AUTH_PASSWORD", "reddit123")
        }
    }

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY"))

@app.get("/recent-mentions")
def recent_mentions():
    # Use cached data for better performance
    subreddits = get_cached_subreddits()
    keywords = get_cached_keywords()
    
    results = get_recent_mentions(subreddits, keywords=keywords, limit=25)
    results = analyze_sentiment(results)  # Add sentiment and score to each post
    # Calculate average sentiment score
    avg_score = round(sum(post["score"] for post in results) / len(results), 2) if results else 0.0
    return {"posts": results, "average_sentiment": avg_score}



@app.post("/flag")
async def flag_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("flagged_posts").insert({"post_id": post_id}).execute()
    return {"success": True}

@app.get("/flagged")
def get_flagged():
    result = supabase.table("flagged_posts").select("post_id").execute()
    ids = [row["post_id"] for row in result.data]
    return ids

@app.post("/unflag")
async def unflag_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("flagged_posts").delete().eq("post_id", post_id).execute()
    return {"success": True}

@app.post("/monitored-subreddits")
async def add_monitored_subreddit(request: Request):
    data = await request.json()
    subreddit = data.get("subreddit")
    if subreddit:
        supabase.table("monitored_subreddits").insert({"name": subreddit}).execute()
        # Clear cache after modification
        get_cached_subreddits.cache_clear()
        return {"success": True}
    return {"success": False, "error": "Missing subreddit"}

@app.delete("/monitored-subreddits/{subreddit}")
def remove_monitored_subreddit(subreddit: str):
    # Case-insensitive match for subreddit name
    result = supabase.table("monitored_subreddits").delete().ilike("name", subreddit).execute()
    # Clear cache after modification
    get_cached_subreddits.cache_clear()
    # Always return success if request completes
    return {"success": True}

@app.get("/monitored-subreddits")
def get_monitored_subreddits():
    result = supabase.table("monitored_subreddits").select("name").execute()
    subreddits = [row["name"] for row in result.data]
    return subreddits

# Keywords management endpoints
@app.post("/keywords")
async def add_keyword(request: Request):
    data = await request.json()
    keyword = data.get("keyword")
    if keyword:
        supabase.table("keywords").insert({"name": keyword}).execute()
        # Clear cache after modification
        get_cached_keywords.cache_clear()
        return {"success": True}
    return {"success": False, "error": "Missing keyword"}

@app.delete("/keywords/{keyword}")
def remove_keyword(keyword: str):
    # Case-insensitive match for keyword name
    result = supabase.table("keywords").delete().ilike("name", keyword).execute()
    # Clear cache after modification
    get_cached_keywords.cache_clear()
    return {"success": True}

@app.get("/keywords")
def get_keywords():
    result = supabase.table("keywords").select("name").execute()
    keywords = [row["name"] for row in result.data]
    # Return default keywords if none are stored in database
    if not keywords:
        return ["Cleverbridge", "Merchant of Record", "MoR", "scaling"]
    return keywords

@app.get("/dashboard-data")
def get_dashboard_data():
    """Single endpoint that returns all dashboard data to reduce API calls"""
    try:
        # Get all data in parallel
        subreddits = get_cached_subreddits()
        keywords = get_cached_keywords()
        
        # Get flagged posts
        flagged_result = supabase.table("flagged_posts").select("post_id").execute()
        flagged_ids = [row["post_id"] for row in flagged_result.data] if flagged_result.data else []
        
        # Get recent mentions
        mentions = get_recent_mentions(subreddits, keywords=keywords, limit=25)
        mentions = analyze_sentiment(mentions)
        
        # Calculate stats
        avg_score = round(sum(post["score"] for post in mentions) / len(mentions), 2) if mentions else 0.0
        opportunities = len([m for m in mentions if m.get("status") == "opportunity"])
        
        return {
            "posts": mentions,
            "average_sentiment": avg_score,
            "flagged_ids": flagged_ids,
            "monitored_subreddits": subreddits,
            "keywords": keywords,
            "stats": {
                "total_mentions": len(mentions),
                "flagged_count": len(flagged_ids),
                "opportunities": opportunities,
                "average_sentiment": avg_score
            }
        }
    except Exception as e:
        return {"error": str(e), "posts": [], "average_sentiment": 0}

app.include_router(reddit_oauth_router)