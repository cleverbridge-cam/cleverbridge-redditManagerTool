import os
from dotenv import load_dotenv
import praw
from textblob import TextBlob
import time

load_dotenv()

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

def get_recent_mentions(subreddits, keywords=["Cleverbridge", "Merchant of Record", "FastSpring","payment methods", "scaling", "payment services","scaling payments"], limit=10):
    mentions = []
    seen_ids = set()

    for subreddit_name in subreddits:
        subreddit = reddit.subreddit(subreddit_name)
        # Use subreddit.search for keyword-based search
        for keyword in keywords:
            # PRAW's search returns a generator, so we need to limit results per keyword
            for post in subreddit.search(keyword, sort="new", limit=limit):
                if post.id in seen_ids:
                    continue  # Skip duplicates
                content = (post.title + " " + (post.selftext or "")).lower()
                if keyword.lower() in content:
                    seen_ids.add(post.id)
                    sentiment_score = TextBlob(post.title + " " + post.selftext).sentiment.polarity
                    sentiment = (
                        "positive" if sentiment_score > 0.2 else
                        "negative" if sentiment_score < -0.2 else
                        "neutral"
                    )

                    mention = {
                        "id": post.id,
                        "subreddit": f"r/{subreddit_name}",
                        "title": post.title,
                        "author": post.author.name if post.author else "anonymous",
                        "sentiment": sentiment,
                        "score": round(sentiment_score, 2),
                        "upvotes": post.score,
                        "comments": post.num_comments,
                        "timeAgo": "Just now",
                        "status": "neutral",
                        "keywords": [keyword.lower()],
                        "url": f"https://reddit.com{post.permalink}"
                    }

                    mentions.append(mention)

    return mentions


# Optional: test block
if __name__ == "__main__":
    test_subreddits = ["SaaS"]
    # Increase limit to 25 to look further back
    results = get_recent_mentions(test_subreddits, limit=50)
    print(f"Fetched {len(results)} mention(s):")
    #for r in results:
        #print(r)
    # Add a short delay to avoid rate limits if looping over more subreddits in future
    time.sleep(1)
