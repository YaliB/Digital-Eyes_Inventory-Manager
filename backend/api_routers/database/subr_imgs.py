from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status

from backend.db.db_img_savers import ImageNotFoundError, image_store

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile = File(...)):
	if not file.content_type or not file.content_type.startswith("image/"):
		raise HTTPException(status_code=400, detail="Only image uploads are allowed")

	file_content = await file.read()
	if not file_content:
		raise HTTPException(status_code=400, detail="Uploaded file is empty")

	return image_store.create_image(
		filename=file.filename or "uploaded-image",
		media_type=file.content_type,
		content=file_content,
	)


@router.get("")
async def list_images():
	return image_store.list_images()


@router.get("/{image_id}")
async def view_image(image_id: int):
	try:
		image_row = image_store.get_image(image_id)
	except ImageNotFoundError as error:
		raise HTTPException(status_code=404, detail="Image not found") from error

	headers = {"Content-Disposition": f'inline; filename="{image_row["filename"]}"'}
	return Response(
		content=image_row["content"],
		media_type=image_row["media_type"],
		headers=headers,
	)


@router.delete("/{image_id}")
async def delete_image(image_id: int):
	try:
		image_store.delete_image(image_id)
	except ImageNotFoundError as error:
		raise HTTPException(status_code=404, detail="Image not found") from error

	return {"message": "Image deleted successfully", "id": image_id}
