from datetime import datetime
from typing import dict
from enum import Enum

import nextcord
from nextcord.ext import commands
from nextcord import Interaction, SlashOption, Embed, Color

class Sectores(Enum):
  FOOD = "Alimentos"
  TEXTILE = "Textil"
  MINERAL = "Mineral"
  ARTIFICIAL = "Artificial"
  METALURGICAL = "Metalúrgica"

class CommandConfig(Enum):
NAME = "precio"
DESCRIPTION = "Consulta el precio de un sector"

OFFER_NAME = "Oferta"
SECTOR_NAME = "Sector"
DEMAND_NAME = "Demanda"

SECTOR_DESCRIPTION = "Sector a consultar"
DEMAND_DESCRIPTION = "Demanda a consultar"
OFFER_DESCRIPTION = "Oferta a consultar"

class CalculatePrice(commands.Cog):
  def __init__(self, bot: commands.Bot):
    self.bot = bot 

def get_default_prices(self, sector: str) -> float:

  default_prices = {
    Sectors.FOOD.value: 11.50,
    Sector.TEXTILE.value: 3.00,
    Sector.MINERAL.value: 14.30,
    Sector.ARTIFICIAL.value: 7.15,
    Sector.METALURGICAL.value: 75.50,
  }
return default_prices.get(sector, 0.0)
