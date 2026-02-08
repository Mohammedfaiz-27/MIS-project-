from enum import Enum


class MasterDataType(str, Enum):
    STEEL_BRAND = "steel_brand"
    CEMENT_BRAND = "cement_brand"
    OTHER_BRAND = "other_brand"
    AREA = "area"
