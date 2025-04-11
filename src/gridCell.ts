// Copyright (c) 2025 by Nathan S. Bushman. Licensed under GPL v3.
import St from "gi://St";
import Clutter from "gi://Clutter";

export class GridCell {
  private _cell: St.Widget;
  private _label: St.Label;
  private _subCells: St.Widget[] = [];
  private _subLabels: St.Label[] = [];
  // Make SUB_LABELS public by removing 'private'
  static readonly SUB_LABELS = [
    "Q",
    "W",
    "E",
    "R",
    "U",
    "I",
    "O",
    "P",
    "A",
    "S",
    "D",
    "F",
    "J",
    "K",
    "L",
    ";",
    "Z",
    "X",
    "C",
    "V",
    "M",
    ",",
    ".",
    "/",
  ];
  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    colLetter: string,
    rowLetter: string,
  ) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;

    // Create the cell container
    this._cell = new St.Widget({
      style_class: "gnomouse-grid-cell",
      reactive: true,
      x: x,
      y: y,
      width: width,
      height: height,
    });

    // Create the main label with two letters
    this._label = new St.Label({
      style_class: "gnomouse-grid-label",
      text: `${colLetter}${rowLetter}`,
    });

    // Center the label in the cell
    this._label.set_position(
      Math.floor((width - this._label.width) / 2),
      Math.floor((height - this._label.height) / 2),
    );

    this._cell.add_child(this._label);
  }

  showSubCells(): void {
    // Hide main label
    this._label.hide();

    // Create 8x3 grid of sub-cells
    const subWidth = Math.floor(this._width / 8);
    const subHeight = Math.floor(this._height / 3);

    let labelIndex = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if (labelIndex < GridCell.SUB_LABELS.length) {
          // Create sub-cell container
          const subCell = new St.Widget({
            style_class: "gnomouse-subcell",
            reactive: true,
            x: col * subWidth,
            y: row * subHeight,
            width: subWidth,
            height: subHeight,
          });

          // Create sub-cell label
          const subLabel = new St.Label({
            style_class: "gnomouse-sublabel",
            text: GridCell.SUB_LABELS[labelIndex++],
          });

          // Center the sub-label
          subLabel.set_position(
            Math.floor((subWidth - subLabel.width) / 2),
            Math.floor((subHeight - subLabel.height) / 2),
          );

          subCell.add_child(subLabel);
          this._cell.add_child(subCell);
          this._subCells.push(subCell);
          this._subLabels.push(subLabel);
        }
      }
    }
  }

  hideSubCells(): void {
    // Show main label
    this._label.show();

    // Remove sub-cells
    this._subCells.forEach((cell) => {
      cell.destroy();
    });
    this._subCells = [];
    this._subLabels = [];
  }

  get widget(): St.Widget {
    return this._cell;
  }

  // Add method to get center coordinates of a sub-cell
  getSubCellCenter(index: number): { x: number; y: number } {
    const subWidth = Math.floor(this._width / 8);
    const subHeight = Math.floor(this._height / 3);

    const row = Math.floor(index / 8);
    const col = index % 8;

    return {
      x: this._x + col * subWidth + subWidth / 2,
      y: this._y + row * subHeight + subHeight / 2,
    };
  }

  // Add method to get center of main cell
  getCellCenter(): { x: number; y: number } {
    return {
      x: this._x + this._width / 2,
      y: this._y + this._height / 2,
    };
  }
}
