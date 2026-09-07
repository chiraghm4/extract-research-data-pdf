from fastapi import APIRouter, File
from typing import Annotated

router = APIRouter()

@router.post('/parsefile/')
async def parse_PDF(file: Annotated[bytes, File()]):
    return {"file length": len(file)}