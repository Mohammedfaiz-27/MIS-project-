from enum import Enum


class ConstructionStage(str, Enum):
    BASEMENT = "basement"
    GROUND_STAGE = "ground_stage"
    LINTEL = "lintel"
    FIRST_RC = "1st_rc"
    SECOND_RC = "2nd_rc"
    PLASTERING = "plastering"


class LeadType(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class LeadStatus(str, Enum):
    FOLLOW_UP = "follow_up"
    WON = "won"
    LOST = "lost"


class BuilderType(str, Enum):
    IHB = "ihb"
    ENGINEER = "engineer"
    CONTRACTOR = "contractor"
