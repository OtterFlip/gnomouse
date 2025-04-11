// Copyright (c) 2025 by Nathan S. Bushman. Licensed under GPL v3.
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { GridCell } from "./gridCell.js";
import GLib from "gi://GLib";

export class GridModal {
  private _modal: St.Widget;
  private _settings: Gio.Settings;
  private _cells: GridCell[] = [];
  private _activeCell?: GridCell;
  private _onHideCallback?: () => void;
  private _firstLetter?: string;
  private _pendingAction?:
    | "left-click"
    | "right-click"
    | "double-click"
    | "drag";
  private _isDragging: boolean = false;
  private _dragStartX?: number;
  private _dragStartY?: number;

  private moveMouse(x: number, y: number): void {
    const seat = Clutter.get_default_backend().get_default_seat();
    const pointer = seat.create_virtual_device(
      Clutter.InputDeviceType.POINTER_DEVICE,
    );
    // First move absolutely to the position
    pointer.notify_absolute_motion(global.get_current_time(), x, y);
    // Then notify relative motion of 0,0 to ensure position is registered
    pointer.notify_relative_motion(global.get_current_time(), 0, 0);
  }

  constructor(settings: Gio.Settings) {
    this._settings = settings;

    // Create the modal overlay
    this._modal = new St.Widget({
      style_class: "gnomouse-grid-modal",
      reactive: true,
      x: 0,
      y: 0,
      width: global.screen_width,
      height: global.screen_height,
    });

    // Create the grid
    this.createGrid();

    // Update key event handler
    this._modal.connect("key-press-event", (_actor, event) => {
      const keySymbol = event.get_key_symbol();

      // Handle special keys first
      switch (keySymbol) {
        case Clutter.KEY_Escape:
          this._pendingAction = undefined;
          this._isDragging = false;
          if (this._activeCell) {
            this._activeCell.hideSubCells();
            this._activeCell = undefined;
            return Clutter.EVENT_STOP;
          }
          this.hide();
          return Clutter.EVENT_STOP;

        case Clutter.KEY_space:
          if (event.get_state() & Clutter.ModifierType.CONTROL_MASK) {
            this._pendingAction = "drag";
          } else {
            this._pendingAction = "left-click";
          }
          return Clutter.EVENT_STOP;

        case Clutter.KEY_BackSpace:
          this._pendingAction = "right-click";
          return Clutter.EVENT_STOP;

        case Clutter.KEY_Return:
          this._pendingAction = "double-click";
          return Clutter.EVENT_STOP;
      }

      // Get raw key input
      let key = event.get_key_unicode();

      // Handle QWERTY layout keys for sub-cell selection first
      if (this._activeCell) {
        const upperKey = key.toUpperCase();
        const keyIndex = GridCell.SUB_LABELS.findIndex(
          (label) => label.toUpperCase() === upperKey,
        );
        if (keyIndex !== -1) {
          const coords = this._activeCell.getSubCellCenter(keyIndex);
          this.moveMouse(coords.x, coords.y);

          // Handle any pending mouse action
          if (this._pendingAction) {
            if (this._isDragging) {
              // Complete the drag operation with motion
              this.simulateDragMotion(
                this._dragStartX!,
                this._dragStartY!,
                coords.x,
                coords.y,
              );
              this._isDragging = false;
              this._pendingAction = undefined;
              this.hide();
            } else if (this._pendingAction === "drag") {
              // Start drag after moving to start location
              this._isDragging = true;
              this._dragStartX = coords.x;
              this._dragStartY = coords.y;
              this.moveMouse(coords.x, coords.y);
              // Don't hide modal, return to main grid for drag end selection
              this._activeCell.hideSubCells();
              this._activeCell = undefined;
              this._firstLetter = undefined;
              return Clutter.EVENT_STOP;
            } else {
              this.performMouseAction(this._pendingAction);
            }
          }

          if (!this._isDragging) {
            this._activeCell = undefined;
            this.hide();
          }
          return Clutter.EVENT_STOP;
        }
      }

      // Convert to uppercase only for main grid selection
      key = key.toUpperCase();

      // Handle first letter (A-Z) when no cell is active
      if (!this._firstLetter && key >= "A" && key <= "Z") {
        this._firstLetter = key;
        return Clutter.EVENT_STOP;
      }

      // Handle second letter (A-Z) to select cell
      if (this._firstLetter && !this._activeCell && key >= "A" && key <= "Z") {
        const col = this._firstLetter.charCodeAt(0) - "A".charCodeAt(0);
        const row = key.charCodeAt(0) - "A".charCodeAt(0);
        const index = row * 26 + col;
        if (index < this._cells.length) {
          this._activeCell = this._cells[index];
          this._activeCell.showSubCells();
          this._firstLetter = undefined;
          return Clutter.EVENT_STOP;
        }
      }

      return Clutter.EVENT_PROPAGATE;
    });
  }

  private createGrid(): void {
    const rows = this._settings.get_int("grid-rows");
    const cols = this._settings.get_int("grid-cols");
    const cellWidth = Math.floor(global.screen_width / cols);
    const cellHeight = Math.floor(global.screen_height / rows);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = new GridCell(
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
          letters[col],
          letters[row],
        );
        this._cells.push(cell);
        this._modal.add_child(cell.widget);
      }
    }
  }

  show(): void {
    // Add the modal to the UI group
    Main.uiGroup.add_child(this._modal);

    // Grab keyboard focus
    this._modal.grab_key_focus();
  }

  hide(): void {
    this._firstLetter = undefined;
    if (this._activeCell) {
      this._activeCell.hideSubCells();
      this._activeCell = undefined;
    }
    if (this._modal.get_parent()) {
      Main.uiGroup.remove_child(this._modal);
    }
    if (this._onHideCallback) {
      this._onHideCallback();
    }
  }

  destroy(): void {
    if (this._modal) {
      this._modal.destroy();
    }
  }

  setOnHideCallback(callback: () => void): void {
    this._onHideCallback = callback;
  }

  private performMouseAction(action: string): void {
    const seat = Clutter.get_default_backend().get_default_seat();
    const pointer = seat.create_virtual_device(
      Clutter.InputDeviceType.POINTER_DEVICE,
    );

    switch (action) {
      case "left-click":
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.PRESSED,
        );
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.RELEASED,
        );
        break;
      case "right-click":
        pointer.notify_button(
          global.get_current_time(),
          3,
          Clutter.ButtonState.PRESSED,
        );
        pointer.notify_button(
          global.get_current_time(),
          3,
          Clutter.ButtonState.RELEASED,
        );
        break;
      case "double-click":
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.PRESSED,
        );
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.RELEASED,
        );
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.PRESSED,
        );
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.RELEASED,
        );
        break;
      case "drag":
        // Immediate mouse down at start position
        pointer.notify_relative_motion(global.get_current_time(), 0, 0);
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.PRESSED,
        );
        break;
      case "drag-release":
        // Ensure we're at the position with a relative motion
        pointer.notify_relative_motion(global.get_current_time(), 0, 0);
        pointer.notify_button(
          global.get_current_time(),
          1,
          Clutter.ButtonState.RELEASED,
        );
        break;
    }
  }

  private simulateDragMotion(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): void {
    const seat = Clutter.get_default_backend().get_default_seat();
    const pointer = seat.create_virtual_device(
      Clutter.InputDeviceType.POINTER_DEVICE,
    );
    const steps = 5; // Fewer steps for faster movement

    // Calculate step sizes
    const dx = (endX - startX) / steps;
    const dy = (endY - startY) / steps;

    // Move to start position and press button
    pointer.notify_absolute_motion(global.get_current_time(), startX, startY);
    pointer.notify_button(
      global.get_current_time(),
      1,
      Clutter.ButtonState.PRESSED,
    );

    // Simulate movement in steps with very short delays
    for (let i = 1; i <= steps; i++) {
      GLib.timeout_add(GLib.PRIORITY_HIGH, i * 10, () => {
        // Higher priority, shorter delay
        const x = startX + dx * i;
        const y = startY + dy * i;
        pointer.notify_absolute_motion(global.get_current_time(), x, y);
        return GLib.SOURCE_REMOVE;
      });
    }

    // Release at final position after all movements complete
    GLib.timeout_add(GLib.PRIORITY_HIGH, (steps + 2) * 10, () => {
      // Extra step delay before release
      pointer.notify_absolute_motion(global.get_current_time(), endX, endY);
      pointer.notify_button(
        global.get_current_time(),
        1,
        Clutter.ButtonState.RELEASED,
      );
      return GLib.SOURCE_REMOVE;
    });
  }
}
