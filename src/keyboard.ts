import type { Button } from "./button.js";

export class Keyboard {
  rows: Button[][] = [];

  static create(): Keyboard {
    return new Keyboard();
  }

  addRow(...row: Button[]): void {
    this.rows.push(row);
  }

  addButton(rowIndex: number, button: Button): void {
    if (!this.checkRow(rowIndex)) {
      throw new Error(`no such row: ${rowIndex}`);
    }
    this.rows[rowIndex]!.push(button);
  }

  deleteRow(index: number): void {
    if (!this.checkRow(index)) {
      throw new Error(`no such row: ${index}`);
    }
    this.rows.splice(index, 1);
  }

  deleteButton(rowIndex: number, buttonIndex: number): void {
    if (!this.checkButton(rowIndex, buttonIndex)) {
      throw new Error(`no button at index ${buttonIndex} or row ${rowIndex}`);
    }
    if (this.rowSize(rowIndex)! < 2) {
      throw new Error("can't delete button: at least one should remain in a row");
    }
    const row = this.rows[rowIndex]!;
    row.splice(buttonIndex, 1);
  }

  changeButton(rowIndex: number, buttonIndex: number, newButton: Button): void {
    if (!this.checkButton(rowIndex, buttonIndex)) {
      throw new Error(`no button at index ${buttonIndex} or row ${rowIndex}`);
    }
    this.rows[rowIndex]![buttonIndex] = newButton;
  }

  swapRows(first: number, second: number): void {
    if (!this.checkRow(first)) {
      throw new Error(`no such index (first): ${first}`);
    }
    if (!this.checkRow(second)) {
      throw new Error(`no such index (second): ${second}`);
    }
    const a = this.rows[first]!;
    this.rows[first] = this.rows[second]!;
    this.rows[second] = a;
  }

  rowsCount(): number {
    return this.rows.length;
  }

  rowSize(row: number): number {
    if (!this.checkRow(row)) return -1;
    return this.rows[row]!.length;
  }

  getKeyboard(): Button[][] {
    return this.rows;
  }

  private checkRow(i: number): boolean {
    return i >= 0 && i < this.rows.length;
  }

  private checkButton(row: number, button: number): boolean {
    return this.checkRow(row) && button >= 0 && button < this.rows[row]!.length;
  }
}

/** Совместимость с именем из Go: NewKeyboard */
export function newKeyboard(): Keyboard {
  return Keyboard.create();
}
