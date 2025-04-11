// Copyright (c) 2025 by Nathan S. Bushman. Licensed under GPL v3.
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { GridModal } from "./gridModal.js";

export default class GnomouseExtension extends Extension {
  private _modal?: GridModal;
  private _sourceIds: number[] = [];
  private _settings?: Gio.Settings;

  enable(): void {
    this._settings = this.getSettings() as any;
    this.bindKey("show-grid", () => this.onShowGrid());
  }

  disable(): void {
    // Clean up any active sources
    this._sourceIds.forEach((id) => GLib.Source.remove(id));

    // Hide grid if visible
    if (this._modal) {
      this._modal.hide();
      this._modal.destroy();
      this._modal = undefined;
    }

    // Unbind keyboard shortcuts
    this.unbindKey("show-grid");

    this._settings = undefined;
    this._sourceIds = [];
  }

  private bindKey(key: string, callback: () => void): void {
    Main.wm.addKeybinding(
      key,
      this._settings!,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL,
      callback,
    );
  }

  private unbindKey(key: string): void {
    Main.wm.removeKeybinding(key);
  }

  private onShowGrid(): void {
    if (!this._modal) {
      this._modal = new GridModal(this._settings!);
      this._modal.setOnHideCallback(() => {
        this._modal = undefined;
      });
      this._modal.show();
    } else {
      this._modal.hide();
      this._modal = undefined;
    }
  }
}
