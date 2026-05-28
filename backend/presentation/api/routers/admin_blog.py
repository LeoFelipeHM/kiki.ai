from fastapi import APIRouter, File, HTTPException, UploadFile, status

from application.blog_service import BlogService
from presentation.api.dependencies import AdminUserDep
from presentation.api.schemas.blog import BlogPostRequest, BlogPostResponse, BlogUploadResponse

router = APIRouter(prefix="/admin/blog", tags=["admin-blog"])


@router.get("/posts", response_model=list[BlogPostResponse])
def list_blog_posts(_admin: AdminUserDep):
    return BlogService().list_posts()


@router.post("/posts", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
def create_blog_post(payload: BlogPostRequest, _admin: AdminUserDep):
    return BlogService().create_post(payload.model_dump())


@router.put("/posts/{post_id}", response_model=BlogPostResponse)
def update_blog_post(post_id: str, payload: BlogPostRequest, _admin: AdminUserDep):
    post = BlogService().update_post(post_id, payload.model_dump())
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    return post


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog_post(post_id: str, _admin: AdminUserDep):
    if not BlogService().delete_post(post_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    return None


@router.post("/upload", response_model=BlogUploadResponse)
def upload_blog_cover(_admin: AdminUserDep, image: UploadFile = File(...)):
    return BlogUploadResponse(url=BlogService().save_cover_image(image))
