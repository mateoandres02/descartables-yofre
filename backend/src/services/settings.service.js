import { SettingsModel } from "../models/settings.model.js";

const KEY = "suggested_price_percents";

function roundUpToHundred(value) {
  return Math.ceil(value / 50) * 50;
}

export function calcSuggestedPrice(cost, percent) {
  return roundUpToHundred(cost * (1 + percent / 100));
}

async function readPercents() {
  const row = await SettingsModel.get(KEY);
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

async function writePercents(percents) {
  await SettingsModel.set(KEY, JSON.stringify(percents));
}

export const SettingsService = {
  async getSuggestedPrices() {
    return readPercents();
  },

  async addSuggestedPrice(percent) {
    const value = Number(percent);
    if (isNaN(value) || value < 0 || value > 1000) {
      throw { status: 400, message: "El porcentaje debe estar entre 0 y 1000." };
    }
    const current = await readPercents();
    if (current.includes(value)) {
      throw { status: 409, message: `El porcentaje ${value}% ya existe.` };
    }
    const updated = [...current, value].sort((a, b) => a - b);
    await writePercents(updated);
    return { percents: updated };
  },

  async removeSuggestedPrice(percent) {
    const value = Number(percent);
    const current = await readPercents();
    const updated = current.filter((p) => p !== value);
    await writePercents(updated);
    return { percents: updated };
  },
};
