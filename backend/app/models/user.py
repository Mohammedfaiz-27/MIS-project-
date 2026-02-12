from enum import Enum


class UserRole(str, Enum):
    SALESPERSON = "salesperson"
    ADMIN = "admin"
