from fastapi import APIRouter, HTTPException, status

from application.blog_service import BlogService
from presentation.api.schemas.blog import BlogPostResponse

router = APIRouter(prefix="/blog", tags=["blog"])


@router.get("/posts", response_model=list[BlogPostResponse])
def list_published_blog_posts():
    return BlogService().list_published_posts()


@router.get("/posts/{slug}", response_model=BlogPostResponse)
def get_published_blog_post(slug: str):
    post = BlogService().get_published_post_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post nao encontrado.")
    return post
