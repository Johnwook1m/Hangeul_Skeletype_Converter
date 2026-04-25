import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_session, Subscriber
from limiter import limiter

router = APIRouter(prefix="/api", tags=["subscribers"])

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


class SubscribeRequest(BaseModel):
    email: str


@router.post("/subscribe")
@limiter.limit("3/minute")
async def subscribe_email(
    request: Request,
    body: SubscribeRequest,
    db: Session = Depends(get_session),
):
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email) or len(email) > 255:
        raise HTTPException(status_code=422, detail="Invalid email address")

    try:
        db.add(Subscriber(email=email))
        db.commit()
    except IntegrityError:
        db.rollback()

    return {"success": True}
