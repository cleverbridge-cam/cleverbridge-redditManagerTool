from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from supabase import create_client, Client
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv
from functools import lru_cache
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse

# Load environment variables from .env file
load_dotenv()
# Try relative imports first (for local development), fall back to absolute (for Railway)
try:
    from .reddit_utils import get_recent_mentions, get_posts_by_ids
    from .sentiment_analysis import analyze_sentiment
    from .reddit_oauth import router as reddit_oauth_router
except ImportError:
    from reddit_utils import get_recent_mentions, get_posts_by_ids
    from sentiment_analysis import analyze_sentiment
    from reddit_oauth import router as reddit_oauth_router

app = FastAPI()

# Allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development (Vite default)
        "http://localhost:8000",  # Local development (current frontend port)
        "http://localhost:8080",
        "https://reddit-sentiment-managerfrontend-production.up.railway.app",
        "https://cleverbridge-redditmanagertool-production.up.railway.app",  # Railway deployment
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

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY"))

@app.get("/recent-mentions")
def recent_mentions():
    # Use cached data for better performance
    subreddits = get_cached_subreddits()
    keywords = get_cached_keywords()
    
    # Get engaged posts
    engaged_result = supabase.table("engaged_posts").select("post_id").execute()
    engaged_ids = set(row["post_id"] for row in engaged_result.data) if engaged_result.data else set()
    
    results = get_recent_mentions(subreddits, keywords=keywords, limit=25)
    # Mark engaged posts and identify opportunities
    opportunity_keywords = ["help", "looking for", "alternative", "recommend", "suggestion", "vs", "compare", 
                          "switch", "moving from", "pricing", "cost", "expensive", "cheaper","Cleverbridge","Merchant of Record","FastSpring"]
    
    for post in results:
        post["engaged"] = post["id"] in engaged_ids
        
    results = analyze_sentiment(results)  # Add sentiment and score to each post
    
    # Identify opportunities based on multiple factors
    for post in results:
        # Initialize score for opportunity factors
        opportunity_score = 0
        
        # Factor 1: Strong sentiment (either positive or negative)
        if abs(post["score"]) > 0.5:
            opportunity_score += 1
        
        # Factor 2: High engagement
        if post["upvotes"] > 5 or post["comments"] > 3:
            opportunity_score += 1
            
        # Factor 3: Keyword matching in title or content
        post_text = post["title"].lower()
        if any(keyword in post_text for keyword in opportunity_keywords):
            opportunity_score += 1
            
        # Factor 4: Negative sentiment about competitors
        competitor_keywords = ["stripe", "fastspring", "paddle", "gumroad"]
        if post["score"] < -0.2 and any(comp in post_text for comp in competitor_keywords):
            opportunity_score += 2
            
        # Mark as opportunity if meets threshold
        post["status"] = "opportunity" if opportunity_score >= 2 else post.get("status", "neutral")
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

@app.post("/engage")
async def engage_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("engaged_posts").insert({"post_id": post_id}).execute()
    return {"success": True}

@app.get("/engaged")
def get_engaged():
    result = supabase.table("engaged_posts").select("post_id").execute()
    ids = [row["post_id"] for row in result.data]
    return ids

@app.post("/unengage")
async def unengage_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("engaged_posts").delete().eq("post_id", post_id).execute()
    return {"success": True}

@app.post("/ignore")
async def ignore_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("ignored_posts").insert({"post_id": post_id}).execute()
    return {"success": True}

@app.get("/ignored")
def get_ignored():
    result = supabase.table("ignored_posts").select("post_id").execute()
    ids = [row["post_id"] for row in result.data]
    return ids

@app.post("/unignore")
async def unignore_post(request: Request):
    data = await request.json()
    post_id = data.get("id")
    supabase.table("ignored_posts").delete().eq("post_id", post_id).execute()
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
        
        # Get ignored posts
        ignored_result = supabase.table("ignored_posts").select("post_id").execute()
        ignored_ids = [row["post_id"] for row in ignored_result.data] if ignored_result.data else []
        
        # Get engaged posts
        engaged_result = supabase.table("engaged_posts").select("post_id").execute()
        engaged_ids = [row["post_id"] for row in engaged_result.data] if engaged_result.data else []
        
        # Get recent mentions
        mentions = get_recent_mentions(subreddits, keywords=keywords, limit=25)
        mentions = analyze_sentiment(mentions)
        
        # Mark engaged posts in recent mentions
        for post in mentions:
            post["engaged"] = post["id"] in engaged_ids
        
        # Get flagged posts that might not be in recent mentions
        flagged_posts = []
        if flagged_ids:
            # Filter out flagged posts that are already in recent mentions
            recent_post_ids = {post["id"] for post in mentions}
            missing_flagged_ids = [fid for fid in flagged_ids if fid not in recent_post_ids]
            
            if missing_flagged_ids:
                flagged_posts = get_posts_by_ids(missing_flagged_ids)
                flagged_posts = analyze_sentiment(flagged_posts)
                # Mark engaged status for flagged posts
                for post in flagged_posts:
                    post["engaged"] = post["id"] in engaged_ids
        
        # Get engaged posts that might not be in recent mentions or flagged posts
        engaged_posts = []
        if engaged_ids:
            # Filter out engaged posts that are already in recent mentions or flagged posts
            existing_post_ids = {post["id"] for post in mentions + flagged_posts}
            missing_engaged_ids = [eid for eid in engaged_ids if eid not in existing_post_ids]
            
            if missing_engaged_ids:
                engaged_posts = get_posts_by_ids(missing_engaged_ids)
                engaged_posts = analyze_sentiment(engaged_posts)
                # Mark engaged status for engaged posts
                for post in engaged_posts:
                    post["engaged"] = True
        
        # Get ignored posts that might not be in recent mentions, flagged posts, or engaged posts
        ignored_posts = []
        if ignored_ids:
            # Filter out ignored posts that are already in recent mentions, flagged posts, or engaged posts
            existing_post_ids = {post["id"] for post in mentions + flagged_posts + engaged_posts}
            missing_ignored_ids = [iid for iid in ignored_ids if iid not in existing_post_ids]
            
            if missing_ignored_ids:
                ignored_posts = get_posts_by_ids(missing_ignored_ids)
                ignored_posts = analyze_sentiment(ignored_posts)
                # Mark engaged status for ignored posts
                for post in ignored_posts:
                    post["engaged"] = post["id"] in engaged_ids
        
        # Combine recent mentions with missing flagged, engaged, and ignored posts
        all_posts = mentions + flagged_posts + engaged_posts + ignored_posts
        
        # Apply opportunity detection logic to all posts
        opportunity_keywords = ["help", "looking for", "alternative", "recommend", "suggestion", "vs", "compare", 
                              "switch", "moving from", "pricing", "cost", "expensive", "cheaper"]
        competitor_keywords = ["stripe", "fastspring", "paddle", "gumroad"]
        
        for post in all_posts:
            # Initialize score for opportunity factors
            opportunity_score = 0
            
            # Factor 1: Strong sentiment (either positive or negative)
            if abs(post["score"]) > 0.5:
                opportunity_score += 1
            
            # Factor 2: High engagement
            if post["upvotes"] > 5 or post["comments"] > 3:
                opportunity_score += 1
                
            # Factor 3: Keyword matching in title or content
            post_text = post["title"].lower()
            if any(keyword in post_text for keyword in opportunity_keywords):
                opportunity_score += 1
                
            # Factor 4: Negative sentiment about competitors
            if post["score"] < -0.2 and any(comp in post_text for comp in competitor_keywords):
                opportunity_score += 2
                
            # Mark as opportunity if meets threshold
            post["status"] = "opportunity" if opportunity_score >= 2 else post.get("status", "neutral")
        
        # Calculate stats
        avg_score = round(sum(post["score"] for post in all_posts) / len(all_posts), 2) if all_posts else 0.0
        opportunities = len([m for m in all_posts if m.get("status") == "opportunity"])
        
        return {
            "posts": all_posts,
            "average_sentiment": avg_score,
            "flagged_ids": flagged_ids,
            "ignored_ids": ignored_ids,
            "engaged_ids": engaged_ids,
            "monitored_subreddits": subreddits,
            "keywords": keywords,
            "stats": {
                "total_mentions": len(all_posts),
                "flagged_count": len(flagged_ids),
                "ignored_count": len(ignored_ids),
                "engaged_count": len(engaged_ids),
                "opportunities": opportunities,
                "average_sentiment": avg_score
            }
        }
    except Exception as e:
        return {"error": str(e), "posts": [], "average_sentiment": 0}

@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    expected_username = os.getenv("AUTH_USERNAME")
    expected_password = os.getenv("AUTH_PASSWORD")
    if not expected_username or not expected_password:
        return JSONResponse(status_code=500, content={"error": "Auth credentials not set on server."})
    if username == expected_username and password == expected_password:
        # Set session cookie
        request.session["authenticated"] = True
        return {"success": True}
    return JSONResponse(status_code=401, content={"success": False, "error": "Invalid username or password"})

app.include_router(reddit_oauth_router)