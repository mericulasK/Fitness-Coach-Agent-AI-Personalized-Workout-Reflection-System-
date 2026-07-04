import { RawProfileInput } from './perception';

export interface GuardrailResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// 1. Validate Input (Onboarding & Settings)
export function validateProfileInput(input: RawProfileInput): GuardrailResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.age < 12 || input.age > 100) {
    errors.push('Yaş değeri 12 ile 100 arasında olmalıdır.');
  }
  if (input.heightCm < 100 || input.heightCm > 250) {
    errors.push('Boy değeri 100 cm ile 250 cm arasında olmalıdır.');
  }
  if (input.weightKg < 30 || input.weightKg > 300) {
    errors.push('Kilo değeri 30 kg ile 300 kg arasında olmalıdır.');
  }
  if (input.daysPerWeek < 1 || input.daysPerWeek > 7) {
    errors.push('Haftalık gün sayısı 1 ile 7 arasında olmalıdır.');
  }
  if (!input.equipment || input.equipment.length === 0) {
    errors.push('En az bir ekipman seçmelisiniz.');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

// 2. Progressive Overload Limit (<10% maximum increase check)
export function checkProgressiveOverload(
  exerciseName: string,
  proposedWeight: number,
  lastWeight: number
): { passed: boolean; allowedWeight: number; warning?: string } {
  if (lastWeight <= 0) return { passed: true, allowedWeight: proposedWeight };

  // Calculate percentage increase
  const percentIncrease = (proposedWeight - lastWeight) / lastWeight;
  
  if (percentIncrease > 0.10) {
    const maxAllowed = Math.round(lastWeight * 1.10 * 2) / 2; // Keep at 10% maximum
    return {
      passed: false,
      allowedWeight: maxAllowed,
      warning: `${exerciseName} için ağırlık artışı haftalık %10 limitini aşmıştır. Güvenliğiniz için ağırlık ${lastWeight} kg'dan maksimum ${maxAllowed} kg'a limitlenmiştir.`
    };
  }

  return {
    passed: true,
    allowedWeight: proposedWeight
  };
}

// 3. Exercise Safety Warnings
export function checkInjuryWarnings(
  exerciseName: string,
  exerciseInjuries: string[],
  userInjuries: string[]
): { safe: boolean; warning?: string } {
  const conflictingInjuries = exerciseInjuries.filter(warning =>
    userInjuries.some(injury => injury.toLowerCase().includes(warning.toLowerCase()))
  );

  if (conflictingInjuries.length > 0) {
    return {
      safe: false,
      warning: `DİKKAT: ${exerciseName} hareketi, sahip olduğunuz kısıtlamalar (${conflictingInjuries.join(', ')}) nedeniyle sakatlık riski barındırabilir. Bu egzersizi yaparken son derece dikkatli olunuz.`
    };
  }

  return {
    safe: true
  };
}

// 4. Medical Disclaimer
export const MEDICAL_DISCLAIMER = 
  "ÖNEMLİ UYARI: Bu uygulama yapay zeka algoritması ve yerel hesaplamalar tabanlı kişiselleştirilmiş bir fitness rehberi sunmaktadır. Tıbbi tavsiye niteliği taşımaz. Herhangi bir sakatlığınız veya kronik rahatsızlığınız varsa egzersiz programına başlamadan önce lütfen bir hekime danışınız.";
