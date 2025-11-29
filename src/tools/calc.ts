/**
 * Calculation Engine - The Logic
 * 
 * Deterministic formula execution with strict validation.
 * Maps input names to hard-coded formulas and executes using mathjs.
 */

import { evaluate } from "mathjs";
import { getFormula, FORMULA_LIBRARY, type FormulaDefinition } from "./formulas";

/**
 * Calculation Result
 */
export interface CalculationResult {
  result: number;
  formula_used: string;
  inputs: Record<string, number>;
}

/**
 * Execute Formula - Safely execute a hard-coded formula
 * 
 * Safety mechanisms:
 * 1. Formula must exist in library (hard-coded)
 * 2. All required inputs must be provided
 * 3. Input types must match (strict validation)
 * 4. Execution uses mathjs (safe math evaluation)
 * 
 * @param formulaName - Name of the formula to execute
 * @param inputs - Input values for the formula
 * @returns Calculation result with formula name and inputs
 * @throws Error if validation fails or execution fails
 */
export function executeFormula(
  formulaName: string,
  inputs: Record<string, any>
): CalculationResult {
  // Step 1: Get formula from library (safety check)
  const formula = getFormula(formulaName);
  if (!formula) {
    throw new Error(
      `Formula "${formulaName}" not found in library. Available formulas: ${Object.keys(
        FORMULA_LIBRARY
      ).join(", ")}`
    );
  }

  // Step 2: Validate inputs (strict typing)
  const validatedInputs: Record<string, number> = {};
  const missingInputs: string[] = [];
  const invalidInputs: string[] = [];

  // Check all required inputs
  for (const [inputName, inputDef] of Object.entries(formula.inputs)) {
    if (inputDef.required) {
      if (!(inputName in inputs)) {
        missingInputs.push(inputName);
      } else {
        // Validate type
        const value = inputs[inputName];
        if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
          invalidInputs.push(`${inputName} (expected number, got ${typeof value})`);
        } else {
          validatedInputs[inputName] = value;
        }
      }
    } else {
      // Optional input - validate if provided
      if (inputName in inputs) {
        const value = inputs[inputName];
        if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
          invalidInputs.push(`${inputName} (expected number, got ${typeof value})`);
        } else {
          validatedInputs[inputName] = value;
        }
      }
    }
  }

  // Check for extra inputs (not in formula definition)
  const extraInputs = Object.keys(inputs).filter(
    (key) => !(key in formula.inputs)
  );
  if (extraInputs.length > 0) {
    throw new Error(
      `Invalid inputs provided: ${extraInputs.join(", ")}. Formula "${formulaName}" only accepts: ${Object.keys(
        formula.inputs
      ).join(", ")}`
    );
  }

  // Report validation errors
  if (missingInputs.length > 0) {
    throw new Error(
      `Missing required inputs for formula "${formulaName}": ${missingInputs.join(", ")}`
    );
  }

  if (invalidInputs.length > 0) {
    throw new Error(
      `Invalid input types for formula "${formulaName}": ${invalidInputs.join(", ")}`
    );
  }

  // Step 3: Execute formula using mathjs (safe evaluation)
  try {
    const result = evaluate(formula.formula, validatedInputs);

    // Validate result is a number
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      throw new Error(
        `Formula execution returned invalid result: ${result}. This may indicate an error in the formula or inputs.`
      );
    }

    return {
      result: result as number,
      formula_used: formulaName,
      inputs: validatedInputs,
    };
  } catch (error: any) {
    throw new Error(
      `Formula execution failed: ${error?.message || "Unknown error"}. Formula: ${formula.formula}`
    );
  }
}

