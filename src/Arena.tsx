import { useEffect, useRef, type MutableRefObject } from "react";
import Phaser from "phaser";
import { characters } from "./characters";
import { Q, KICK, step, type Battle, type Event } from "./sim";
export type Control = {
  state: Battle;
  paused: boolean;
  speed: number;
  hidden: boolean;
  onTick: () => void;
  actual: number;
  events: Event[];
};
export function Arena({ control }: { control: MutableRefObject<Control> }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let game: Phaser.Game;
    class Scene extends Phaser.Scene {
      ink!: Phaser.GameObjects.Graphics;
      effects!: Phaser.GameObjects.Graphics;
      actors = new Map<number, Phaser.GameObjects.Container>();
      debt = 0;
      lastState: Battle | null = null;
      sample = 0;
      ticks = 0;
      stamp = 0;
      damageLabels = new Map<number, { until: number; amount: number }>();
      create() {
        this.effects = this.add.graphics().setDepth(1000);
        this.ink = this.add.graphics();
        this.ink.fillStyle(0x24354a);
        this.ink.fillRect(0, 0, 384, 512);
        this.ink.lineStyle(1, 0x30465b, 0.65);
        for (let x = 0; x < 384; x += 32) this.ink.lineBetween(x, 0, x, 512);
        for (let y = 0; y < 512; y += 32) this.ink.lineBetween(0, y, 384, y);
        this.ink.lineStyle(3, 0x6a8794, 0.5);
        this.ink.strokeRoundedRect(10, 10, 364, 492, 20);
        this.ink.lineStyle(1, 0x83a5ae, 0.2);
        this.ink.strokeCircle(192, 256, 65);
        this.add
          .text(192, 256, "S / S", {
            fontFamily: "monospace",
            fontSize: "25px",
            color: "#7795a5",
          })
          .setOrigin(0.5)
          .setAlpha(0.15);
        for (const team of ["A", "B"] as const) {
          const g = this.make.graphics({ x: 0, y: 0 });
          for (const [x, y, w, h, color] of characters[team]) {
            g.fillStyle(color);
            g.fillRect(x, y, w, h);
          }
          g.generateTexture(team, 24, 26);
          g.destroy();
        }
      }
      update(time: number, delta: number) {
        const c = control.current,
          s = c.state;
        if (this.lastState !== s) {
          for (const a of this.actors.values()) a.destroy();
          this.actors.clear();
          this.damageLabels.clear();
          this.lastState = s;
          this.debt = 0;
          this.sample = 0;
          this.ticks = 0;
        }
        if (c.paused || c.hidden || s.outcome) {
          this.debt = 0;
        } else {
          this.debt = Math.min(this.debt + Math.min(delta, 100) * c.speed, 400);
          let n = 0;
          while (this.debt >= 1000 / 30 && n < 12) {
            step(s);
            for (const e of s.events)
              if (e.kind === "damage")
                this.damageLabels.set(e.target, {
                  until: s.tick + 10,
                  amount: e.actual || 0,
                });
            c.events.push(...s.events);
            if (c.events.length > 200)
              c.events.splice(0, c.events.length - 200);
            this.debt -= 1000 / 30;
            n++;
            this.ticks++;
            if (s.outcome) break;
          }
        }
        this.sample += delta;
        if (this.sample >= 1000) {
          c.actual = this.ticks / 30 / (this.sample / 1000);
          this.sample = 0;
          this.ticks = 0;
        }
        this.effects.clear();
        for (const u of s.units) {
          if (
            u.hp > 0 &&
            (u.kick || (u.flash === "kick" && s.tick <= u.flashUntil))
          ) {
            const angle = u.kick
              ? Math.atan2(u.kick.dy, u.kick.dx)
              : Math.atan2(
                  (s.units.find((v) => v.id === u.target)?.y ?? u.y) - u.y,
                  (s.units.find((v) => v.id === u.target)?.x ?? u.x) - u.x,
                );
            this.effects.lineStyle(
              u.kick ? 2 : 4,
              u.kick ? 0xffcf66 : 0xffffff,
              0.85,
            );
            this.effects.beginPath();
            this.effects.arc(
              u.x / Q,
              u.y / Q,
              KICK.range / Q,
              angle - Math.PI / 3,
              angle + Math.PI / 3,
            );
            this.effects.strokePath();
            if (u.kick) {
              for (const edge of [angle - Math.PI / 3, angle + Math.PI / 3])
                this.effects.lineBetween(
                  u.x / Q,
                  u.y / Q,
                  u.x / Q + Math.cos(edge) * 32,
                  u.y / Q + Math.sin(edge) * 32,
                );
            }
          }
          let a = this.actors.get(u.id);
          if (!a) {
            const sprite = this.add.image(0, -8, u.team).setScale(1.4);
            const bar = this.add
              .rectangle(-10, -29, 20, 2, 0x76efc7)
              .setOrigin(0, 0.5);
            const text = this.add
              .text(0, -40, "", {
                fontSize: "10px",
                fontFamily: "sans-serif",
                color: "#fff1c0",
                stroke: "#111b2b",
                strokeThickness: 2,
              })
              .setOrigin(0.5);
            a = this.add.container(u.x / Q, u.y / Q, [sprite, bar, text]);
            this.actors.set(u.id, a);
          }
          const sprite = a.list[0] as Phaser.GameObjects.Image,
            bar = a.list[1] as Phaser.GameObjects.Rectangle,
            text = a.list[2] as Phaser.GameObjects.Text;
          a.setPosition(Math.round(u.x / Q), Math.round(u.y / Q));
          a.setDepth(u.y / Q);
          bar.width = (20 * u.hp) / u.maxHp;
          const active = s.tick <= u.flashUntil;
          a.setVisible(u.hp > 0 || active);
          a.setAlpha(u.hp > 0 ? 1 : 0.35);
          sprite.setAngle(
            u.hp === 0
              ? 90
              : active && u.flash === "dodge"
                ? -22
                : active && u.flash === "attack"
                  ? 15
                  : 0,
          );
          sprite.setY(-8 + (u.flash === "walk" && s.tick % 8 < 4 ? -1 : 0));
          sprite.setTint(
            active && (u.flash === "hit" || u.flash === "crit")
              ? 0xffc9bc
              : 0xffffff,
          );
          const dmg = this.damageLabels.get(u.id);
          text.setText(
            dmg && dmg.until >= s.tick
              ? `${u.flash === "crit" ? "✦ " : ""}−${(dmg.amount / 100).toFixed(1)}`
              : active
                ? (
                    {
                      kick: "돌려차기!",
                      crit: "✦ 치명!",
                      dodge: "회피",
                      ko: "KO",
                      attack: "·",
                    } as Record<string, string>
                  )[u.flash] || ""
                : "",
          );
        }
        if (time - this.stamp > 100) {
          this.stamp = time;
          c.onTick();
        }
      }
    }
    game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 384,
      height: 512,
      parent: host.current!,
      backgroundColor: "#24354a",
      pixelArt: true,
      antialias: false,
      scene: Scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
      banner: false,
    });
    return () => game.destroy(true);
  }, [control]);
  return <div className="arena" ref={host} aria-label="픽셀 자동전투 경기장" />;
}
