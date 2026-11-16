import { useEffect, useRef, type MutableRefObject } from "react";
import Phaser from "phaser";
import { actorScale, cries, sobFrame } from "./presentation";
import { characters } from "./characters";
import { Q, KICK, MAGE, LOCK, step, type Battle, type Event } from "./sim";
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
      emotionClock = 0;
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      impacts = new Map<number, {until:number; freeze:number; x:number; y:number}>();
      sparks: {x:number;y:number;born:number;angle:number}[] = [];
      shakeUntil = 0;
      bubbles: Phaser.GameObjects.Container[] = [];
      damageLabels = new Map<number, { until: number; amount: number }>();
      create() {
        for(let i=0;i<6;i++) {
          const panel=this.add.graphics();
          const words=this.add.text(0,0,"야심!만만",{fontFamily:"sans-serif",fontSize:"20px",fontStyle:"bold",color:"#182235"}).setOrigin(0.5);
          this.bubbles.push(this.add.container(0,0,[panel,words]).setDepth(2000+i).setVisible(false));
        }
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
        for (const team of ["youth", "adult", "mage", "seokho"] as const) {
          const g = this.make.graphics({ x: 0, y: 0 });
          for (const [x, y, w, h, color] of characters[team]) {
            g.fillStyle(color);
            g.fillRect(x, y, w, h);
          }
          g.generateTexture(team, 26, 26);
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
          this.impacts.clear(); this.sparks=[]; this.shakeUntil=0; this.cameras.main.setScroll(0,0);
          this.lastState = s;
          this.debt = 0;
          this.emotionClock = 0;
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
            for (const e of s.events) {
              if (e.kind === "damage") {
                this.damageLabels.set(e.target, { until:s.tick+10, amount:e.actual||0 });
                const target=s.units[e.target];
                const a=this.actors.get(e.target);
                this.impacts.set(e.target,{until:this.emotionClock+170,freeze:this.emotionClock+45,x:a?.x??target.x/Q,y:a?.y??target.y/Q});
                if(!this.reduced.matches) this.shakeUntil=this.emotionClock+90;
                for(let i=0;i<4;i++) this.sparks.push({x:target.x/Q,y:target.y/Q,born:this.emotionClock,angle:i*Math.PI/2+e.target});
                if(this.sparks.length>120) this.sparks.splice(0,this.sparks.length-120);
              }
            }
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
        if (!c.paused && !c.hidden) this.emotionClock += Math.min(delta, 100);
        this.effects.clear();
        const shake=!this.reduced.matches && this.emotionClock<this.shakeUntil ? Math.sin(this.emotionClock*0.15)*1.5 : 0;
        this.cameras.main.setScroll(shake, -shake*0.5);
        this.sparks=this.sparks.filter(p=>this.emotionClock-p.born<180);
        for(const p of this.sparks) {
          const age=this.emotionClock-p.born;
          const radius=this.reduced.matches?3:age*0.055;
          this.effects.fillStyle(0xffecab,1-age/180);
          this.effects.fillRect(p.x+Math.cos(p.angle)*radius,p.y+Math.sin(p.angle)*radius,2,2);
        }
        for(const bolt of s.projectiles) {
          this.effects.lineStyle(3,0xc4a0ff,0.75);
          this.effects.lineBetween(bolt.x/Q-bolt.vx/Q,bolt.y/Q-bolt.vy/Q,bolt.x/Q,bolt.y/Q);
          this.effects.fillStyle(0xffffff);this.effects.fillCircle(bolt.x/Q,bolt.y/Q,3);
          this.effects.lineStyle(1,0x9aeaff);this.effects.strokeCircle(bolt.x/Q,bolt.y/Q,5);
        }
        // Presentation-only pool: six readable, non-overlapping bubbles at most.
        // Stable actor order supplies deterministic visual priority in crowded casts.
        this.bubbles.forEach(b=>b.setVisible(false));
        const speech: {id:number;x:number;y:number;width:number;height:number;phrase:string}[]=[];
        for(const u of s.units) {
          const phrase=u.cast?"야심!만만":u.lock?.phase==="lock"?"자신있게 맞아줄게":u.lock?.phase==="prone"?"내가 잘못했어 ㅠㅠ":"";
          if(s.outcome || u.hp<=0 || !phrase || speech.length>=6) continue;
          const half=u.cast?66:102;
          const x=Math.max(half+4,Math.min(380-half,u.x/Q));
          const preferred=u.y/Q-61;
          const candidates=[preferred,preferred-48,preferred+48,preferred-96];
          const y=candidates.map(v=>Math.max(26,Math.min(486,v))).find(v=>speech.every(b=>Math.abs(b.x-x)>=b.width/2+half+6 || Math.abs(b.y-v)>=46));
          if(y===undefined) continue;
          const bubble=this.bubbles[speech.length]; bubble.setPosition(x,y).setVisible(true);
          (bubble.list[1] as Phaser.GameObjects.Text).setText(phrase).setFontSize(u.cast?20:18);
          const g=bubble.list[0] as Phaser.GameObjects.Graphics;
          const tipX=Math.max(-57,Math.min(57,u.x/Q-x));
          const bottom=y<u.y/Q; const edge=bottom?20:-20; const tip=bottom?29:-29;
          g.clear().fillStyle(0x111b2b,0.25).fillRoundedRect(-half+2,-17,half*2,40,11);
          g.fillStyle(0xfffdf0).lineStyle(2,0x182235);
          g.fillTriangle(tipX-7,edge,tipX+7,edge,tipX,tip);
          g.strokeTriangle(tipX-7,edge,tipX+7,edge,tipX,tip);
          g.fillRoundedRect(-half,-20,half*2,40,10);g.strokeRoundedRect(-half,-20,half*2,40,10);
          speech.push({id:u.id,x,y,width:half*2,height:40,phrase});
        }
        const rendered: object[] = [];
        for (const u of s.units) {
          if(u.hp>0) {
            this.effects.lineStyle(1.5,u.team==="A"?0x76efc7:0xff9b82,0.8);
            this.effects.strokeEllipse(u.x/Q,u.y/Q+8,17,7);
          }
          if(u.lock && u.hp>0 && !s.outcome && u.lock.phase!=="prone") {
            const target=s.units[u.lock.target];
            if(target?.hp>0) {
              const p=u.lock.phase==="lock"?Math.max(0,(u.lock.due-s.tick)/LOCK.windup):0;
              this.effects.lineStyle(2,0xff4b57,0.95);
              this.effects.strokeCircle(target.x/Q,target.y/Q,10+22*p);
              this.effects.lineBetween(target.x/Q-5,target.y/Q,target.x/Q+5,target.y/Q);
            }
          }
          if(u.cast && u.hp>0) {
            const p=1-(u.cast.due-s.tick)/MAGE.windup;
            this.effects.lineStyle(2,0xc4a0ff,0.9);
            this.effects.strokeCircle(u.x/Q,u.y/Q,12+8*p);
            this.effects.fillStyle(0xe8ddff,0.5); this.effects.fillCircle(u.x/Q,u.y/Q-29,2+3*p);
          }
          if (
            u.hp > 0 &&
            (u.kick || (u.kickPoseUntil > 0 && s.tick <= u.kickPoseUntil))
          ) {
            const progress = u.kick
              ? 1 - (u.kick.due - s.tick) / KICK.windup
              : 1;
            this.effects.lineStyle(
              u.kick ? 2 : 4,
              u.kick ? 0xffcf66 : 0xffffff,
              0.9,
            );
            this.effects.strokeCircle(u.x / Q, u.y / Q, KICK.range / Q);
            this.effects.lineStyle(2, 0xffcf66, 0.65);
            this.effects.strokeCircle(
              u.x / Q,
              u.y / Q,
              (KICK.range / Q) * (u.kick ? progress : 1.12),
            );
          }
          let a = this.actors.get(u.id);
          if (!a) {
            const sprite = this.add.image(0, -8, u.character).setScale(actorScale(u.character));
            const bar = this.add
              .rectangle(-10, -29, 20, 2, u.team==="A"?0x76efc7:0xff9b82)
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
            const leg = this.add.graphics();
            leg.fillStyle(0x131d2b); leg.fillRect(0, -4, 23, 8);
            leg.fillStyle(0xf2c5a3); leg.fillRect(20, -4, 9, 8);
            leg.fillStyle(0xeef2f5); leg.fillRect(27, -5, 6, 10);
            leg.setVisible(false);
            const fist=this.add.graphics();
            fist.fillStyle(0xa4d8ee);fist.fillRect(0,-3,12,6);
            fist.fillStyle(0xffd2ad);fist.fillRect(11,-4,8,8);fist.setVisible(false);
            a = this.add.container(u.x / Q, u.y / Q, [sprite, bar, text, leg, fist]);
            this.actors.set(u.id, a);
          }
          const sprite = a.list[0] as Phaser.GameObjects.Image,
            bar = a.list[1] as Phaser.GameObjects.Rectangle,
            text = a.list[2] as Phaser.GameObjects.Text;
          a.setPosition(Math.round(u.x / Q), Math.round(u.y / Q));
          const impact=this.impacts.get(u.id);
          const hitStop=!!impact && this.emotionClock<impact.freeze && !this.reduced.matches;
          if(hitStop) a.setPosition(impact!.x,impact!.y);
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
          if(impact && this.emotionClock<impact.until && u.hp>0 && !s.outcome) sprite.setTintFill(0xfff5db);
          const leg = a.list[3] as Phaser.GameObjects.Graphics;
          leg.setVisible(false);
          const fist=a.list[4] as Phaser.GameObjects.Graphics;fist.setVisible(false);
          const spinTick = s.tick + (c.paused || c.hidden ? 0 : this.debt / (1000 / 30));
          const winding = u.hp > 0 && !!u.kick;
          const recovering = u.hp > 0 && u.kickPoseUntil > 0 && s.tick <= u.kickPoseUntil;
          let kickPhase = "none";
          if (winding || recovering) {
            const p = winding ? Math.max(0, Math.min(1, 1 - (u.kick!.due - spinTick) / KICK.windup))
              : Math.max(0, Math.min(1, (spinTick - (u.kickPoseUntil - 10)) / 10));
            kickPhase = winding ? "windup" : "spin-recovery";
            const angle = this.reduced.matches ? 0 : winding ? -40 * p : -40 + 400 * Math.min(1, p / 0.7);
            sprite.setAngle(angle).setY(-8 - (this.reduced.matches ? 0 : Math.sin(p * Math.PI) * 4));
            leg.setVisible(true).setPosition(0, -3).setAngle(angle + 15)
              .setScale(winding ? 0.25 + 0.35 * p : 1 - 0.65 * p);
          } else if (u.hp > 0 && u.recoilLeft > 0 && !this.reduced.matches) {
            sprite.setAngle(u.kx >= 0 ? -20 : 20).setY(-10);
          }
          sprite.setScale(actorScale(u.character));
          let lockPhase="none",kneeSlap=false;
          if(u.hp>0 && u.lock && !s.outcome) {
            lockPhase=u.lock.phase;
            const target=s.units[u.lock.target];
            const aim=target?Math.atan2(target.y-u.y,target.x-u.x)*180/Math.PI:0;
            if(lockPhase==="lock") {
              const elapsed=LOCK.windup-(u.lock.due-s.tick);
              const slap=(elapsed>=7&&elapsed<11)||(elapsed>=21&&elapsed<25);kneeSlap=slap;
              sprite.setScale(actorScale(u.character)*1.08,actorScale(u.character)*0.78).setY(-3);
              this.effects.fillStyle(0xffd2ad);
              for(const side of [-1,1]) {
                const handY=a.y+(slap?5:-2);
                this.effects.fillRect(a.x+side*9-2,handY,5,4);
                if(slap){this.effects.lineStyle(1,0xffe296);this.effects.strokeCircle(a.x+side*9,handY,6);}
              }
            } else if(lockPhase==="prone") {
              sprite.setAngle(90).setY(2);
            } else if(lockPhase==="left"||lockPhase==="right") {
              const remaining=u.lock.due-s.tick;
              sprite.setAngle(this.reduced.matches?0:(lockPhase==="left"?-18:18));
              fist.setVisible(true).setScale(remaining<=3?1:0.6).setPosition(lockPhase==="left"?-6:6,-8)
                .setAngle(aim+(lockPhase==="left"?-20:20)).setAlpha(remaining<=3?1:0.7);
            } else sprite.setAngle(this.reduced.matches?0:12);
          }
          const crying = cries(s.outcome, u.team, u.hp);
          const emotion = sobFrame(this.emotionClock, u.id, this.reduced.matches);
          if (crying) {
            sprite.setAngle(emotion.angle).setY(-8 + emotion.bob).clearTint();
            // Bright pixel tears below both eyes; presentation-only, no engine writes.
            const scale = actorScale(u.character);
            this.effects.fillStyle(0x83eaff, 1);
            for (const side of [-1, 1]) {
              const x = a.x + side * 5 * scale;
              const y = a.y - 12 * scale + emotion.bob + emotion.drop;
              this.effects.fillRect(x - 1, y, 3, 5);
              this.effects.fillRect(x, y - 2, 1, 2);
            }
          }
          rendered.push({ id:u.id, team:u.team, character:u.character, cast:!!u.cast, fleeing:u.fleeing, hitStop, hp:u.hp, crying, scale:sprite.scaleX,
            y:sprite.y, angle:sprite.angle, kickPhase, lockPhase, kneeSlap, fistVisible:fist.visible, scaleY:sprite.scaleY, legVisible:leg.visible, legAngle:leg.angle, x:a.x, worldY:a.y, recoilLeft:u.recoilLeft, drop:crying ? emotion.drop : null, visible:a.visible });
          const dmg = this.damageLabels.get(u.id);
          text.setText(
            crying ? "훌쩍…" : u.cast ? "" : dmg && dmg.until >= s.tick
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
        if (new URLSearchParams(location.search).has("diagnostics")) {
          host.current!.dataset.render = JSON.stringify(rendered);
          host.current!.dataset.speech = JSON.stringify(speech);
          host.current!.dataset.feedback=JSON.stringify({particles:this.sparks.length,shake,projectiles:s.projectiles.length,clock:this.emotionClock});
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
