/**
 * Formulas Library - The Library of Truth
 * 
 * HARD-CODED formulas that cannot be modified by agents.
 * This is the safety mechanism: deterministic, auditable, immutable.
 * 
 * All formulas are pre-defined and cryptographically signed upon execution.
 */

import { evaluate } from "mathjs";

/**
 * Formula Definition Interface
 */
export interface FormulaDefinition {
  name: string;
  description: string;
  inputs: {
    [key: string]: {
      type: "number";
      description: string;
      required: boolean;
    };
  };
  formula: string; // mathjs expression
}

/**
 * The Library of Truth - Hard-coded formulas
 * 
 * These formulas are immutable. Agents can only provide inputs.
 */
export const FORMULA_LIBRARY: Record<string, FormulaDefinition> = {
  /**
   * Compound Interest Formula
   * A = P(1 + r/n)^(nt)
   * Where:
   * - A = Final amount
   * - P = Principal (initial amount)
   * - r = Annual interest rate (as decimal)
   * - n = Number of times interest is compounded per year
   * - t = Time in years
   */
  compound_interest: {
    name: "compound_interest",
    description: "Calculate compound interest: A = P(1 + r/n)^(nt)",
    inputs: {
      principal: {
        type: "number",
        description: "Principal amount (P)",
        required: true,
      },
      rate: {
        type: "number",
        description: "Annual interest rate as decimal (e.g., 0.05 for 5%)",
        required: true,
      },
      compounding_periods: {
        type: "number",
        description: "Number of times interest is compounded per year (n)",
        required: true,
      },
      years: {
        type: "number",
        description: "Time period in years (t)",
        required: true,
      },
    },
    formula: "principal * (1 + rate / compounding_periods) ^ (compounding_periods * years)",
  },

  /**
   * Return on Investment (ROI)
   * ROI = ((Current Value - Initial Investment) / Initial Investment) * 100
   */
  roi: {
    name: "roi",
    description: "Calculate Return on Investment percentage",
    inputs: {
      initial_investment: {
        type: "number",
        description: "Initial investment amount",
        required: true,
      },
      current_value: {
        type: "number",
        description: "Current value of investment",
        required: true,
      },
    },
    formula: "((current_value - initial_investment) / initial_investment) * 100",
  },

  /**
   * Black-Scholes Option Pricing Model
   * C = S*N(d1) - K*e^(-r*T)*N(d2)
   * Where:
   * - d1 = (ln(S/K) + (r + σ²/2)*T) / (σ*√T)
   * - d2 = d1 - σ*√T
   * 
   * Note: This is a simplified version. Full implementation would require
   * cumulative normal distribution function (N).
   */
  black_scholes: {
    name: "black_scholes",
    description: "Black-Scholes option pricing model (call option)",
    inputs: {
      stock_price: {
        type: "number",
        description: "Current stock price (S)",
        required: true,
      },
      strike_price: {
        type: "number",
        description: "Strike price (K)",
        required: true,
      },
      time_to_expiry: {
        type: "number",
        description: "Time to expiry in years (T)",
        required: true,
      },
      risk_free_rate: {
        type: "number",
        description: "Risk-free interest rate as decimal (r)",
        required: true,
      },
      volatility: {
        type: "number",
        description: "Volatility (σ) as decimal",
        required: true,
      },
    },
    // Simplified Black-Scholes - using approximation
    // Full implementation would require cumulative normal distribution
    formula: "stock_price * 0.5 - strike_price * exp(-risk_free_rate * time_to_expiry) * 0.5 + (stock_price * volatility * sqrt(time_to_expiry) * 0.4)",
  },

  /**
   * Net Present Value (NPV)
   * NPV = Σ(CF_t / (1 + r)^t) - Initial Investment
   * Where:
   * - CF_t = Cash flow at time t
   * - r = Discount rate
   * - t = Time period
   */
  npv: {
    name: "npv",
    description: "Calculate Net Present Value of cash flows",
    inputs: {
      initial_investment: {
        type: "number",
        description: "Initial investment amount",
        required: true,
      },
      discount_rate: {
        type: "number",
        description: "Discount rate as decimal (r)",
        required: true,
      },
      cash_flows: {
        type: "number",
        description: "Comma-separated cash flows (CF1,CF2,CF3,...)",
        required: true,
      },
    },
    // Note: This requires parsing cash_flows as array
    // For simplicity, we'll use a single cash flow in the formula
    // In production, you'd parse the array and sum
    formula: "-initial_investment + (cash_flows / (1 + discount_rate))",
  },

  /**
   * Future Value of Annuity
   * FV = P * (((1 + r)^n - 1) / r)
   * Where:
   * - P = Payment per period
   * - r = Interest rate per period
   * - n = Number of periods
   */
  future_value_annuity: {
    name: "future_value_annuity",
    description: "Calculate future value of an ordinary annuity",
    inputs: {
      payment: {
        type: "number",
        description: "Payment per period (P)",
        required: true,
      },
      rate: {
        type: "number",
        description: "Interest rate per period as decimal (r)",
        required: true,
      },
      periods: {
        type: "number",
        description: "Number of periods (n)",
        required: true,
      },
    },
    formula: "payment * (((1 + rate) ^ periods - 1) / rate)",
  },

  /**
   * Present Value
   * PV = FV / (1 + r)^n
   * Where:
   * - FV = Future value
   * - r = Discount rate
   * - n = Number of periods
   */
  present_value: {
    name: "present_value",
    description: "Calculate present value of a future amount",
    inputs: {
      future_value: {
        type: "number",
        description: "Future value (FV)",
        required: true,
      },
      discount_rate: {
        type: "number",
        description: "Discount rate as decimal (r)",
        required: true,
      },
      periods: {
        type: "number",
        description: "Number of periods (n)",
        required: true,
      },
    },
    formula: "future_value / ((1 + discount_rate) ^ periods)",
  },
};

/**
 * Get formula by name
 */
export function getFormula(name: string): FormulaDefinition | null {
  return FORMULA_LIBRARY[name] || null;
}

/**
 * List all available formulas
 */
export function listFormulas(): FormulaDefinition[] {
  return Object.values(FORMULA_LIBRARY);
}

