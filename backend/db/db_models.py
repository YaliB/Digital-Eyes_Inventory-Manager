from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    items_type_added = Column(Integer, default=0)
    uploaded_photos = Column(Integer, default=0)
    
class Product(Base):
    __tablename__ = "products_legacy"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=True)
    name = Column(String, index=True, nullable=False)
    img_path = Column(String, nullable=True)
    price = Column(Integer, nullable=True)
    price_on_sale = Column(Integer, nullable=True)
    sale_expiration_date = Column(DateTime, nullable=True)

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products_legacy.id"), nullable=False)
    category = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    on_shelf = Column(Boolean, default=True)
    shelf_restock = Column(Integer, default=0)
    product = relationship("Product")
    
class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    category = Column(String, nullable=True)
    expiration_date = Column(DateTime, nullable=True)