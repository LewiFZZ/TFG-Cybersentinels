import { Component, computed, input, signal } from '@angular/core';
import { DailyStat } from '../../core/api/api.models';

const W = 720;
const H = 240;
const M = { top: 12, right: 8, bottom: 28, left: 36 };
const GAP = 2; // separación entre segmentos apilados
const RADIUS = 4; // esquinas redondeadas del extremo de la barra

type Key = 'safe' | 'suspicious' | 'malicious';
const SERIES: { key: Key; label: string }[] = [
  { key: 'safe', label: 'Seguros' },
  { key: 'suspicious', label: 'Sospechosos' },
  { key: 'malicious', label: 'Maliciosos' },
];

interface Segment {
  key: Key;
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  top: boolean;
}

/**
 * Barras apiladas por día (seguros / sospechosos / maliciosos) en SVG propio:
 * sin librerías externas, compatible con la CSP del backend.
 * Accesible: leyenda con texto, tooltip al pasar el ratón y vista de tabla.
 */
@Component({
  selector: 'app-daily-chart',
  template: `
    <div class="chart">
      <ul class="legend" aria-label="Leyenda">
        @for (s of series; track s.key) {
          <li><span class="swatch" [class]="'swatch--' + s.key" aria-hidden="true"></span>{{ s.label }}</li>
        }
      </ul>

      <div class="chart__plot">
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          role="img"
          [attr.aria-label]="ariaLabel()"
        >
          @for (t of ticks(); track t.value) {
            <line class="chart__grid" [attr.x1]="m.left" [attr.x2]="width - m.right" [attr.y1]="t.y" [attr.y2]="t.y" />
            <text class="chart__axis" [attr.x]="m.left - 6" [attr.y]="t.y + 4" text-anchor="end">{{ t.value }}</text>
          }

          @for (seg of segments(); track $index) {
            <path [attr.d]="path(seg)" [class]="'bar bar--' + seg.key" [class.bar--dim]="hovered() !== null && hovered() !== seg.i" />
          }

          @for (l of xLabels(); track l.x) {
            <text class="chart__axis" [attr.x]="l.x" [attr.y]="height - 8" text-anchor="middle">{{ l.text }}</text>
          }

          @for (d of data(); track d.date; let i = $index) {
            <rect
              class="chart__hit"
              [attr.x]="m.left + i * step()"
              [attr.y]="m.top"
              [attr.width]="step()"
              [attr.height]="plotH"
              (mouseenter)="hover(i)"
              (mouseleave)="hover(null)"
            />
          }
        </svg>

        @if (tooltip(); as tip) {
          <div class="chart__tooltip" [style.left.%]="tip.leftPct" role="presentation">
            <strong>{{ tip.date }}</strong>
            <span>Total: {{ tip.d.total }}</span>
            @for (s of series; track s.key) {
              <span><span class="swatch" [class]="'swatch--' + s.key"></span>{{ s.label }}: {{ tip.d[s.key] }}</span>
            }
          </div>
        }
      </div>

      <details class="chart__table">
        <summary>Ver los datos en tabla</summary>
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col" class="num">Total</th>
              @for (s of series; track s.key) {
                <th scope="col" class="num">{{ s.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (d of data(); track d.date) {
              <tr>
                <td>{{ formatDate(d.date) }}</td>
                <td class="num">{{ d.total }}</td>
                @for (s of series; track s.key) {
                  <td class="num">{{ d[s.key] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </details>
    </div>
  `,
})
export class DailyChart {
  readonly data = input.required<DailyStat[]>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly m = M;
  protected readonly plotH = H - M.top - M.bottom;
  protected readonly series = SERIES;
  protected readonly hovered = signal<number | null>(null);

  /** Máximo del eje Y: el doble de un paso "bonito" (1, 2, 5, 10, 20, 50…) para que las marcas sean enteras. */
  private readonly yMax = computed(() => {
    const max = Math.max(1, ...this.data().map((d) => d.total));
    const raw = max / 2;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((f) => f * magnitude).find((v) => v >= raw) ?? raw;
    return Math.max(2, Math.ceil(step) * 2);
  });

  protected readonly step = computed(() => (W - M.left - M.right) / Math.max(1, this.data().length));

  private y(value: number): number {
    return M.top + this.plotH - (value / this.yMax()) * this.plotH;
  }

  protected readonly ticks = computed(() =>
    [0, this.yMax() / 2, this.yMax()].map((value) => ({ value, y: this.y(value) })),
  );

  protected readonly segments = computed<Segment[]>(() => {
    const step = this.step();
    const barW = Math.max(2, Math.min(28, step * 0.7));
    const out: Segment[] = [];
    this.data().forEach((d, i) => {
      const x = M.left + i * step + (step - barW) / 2;
      const present = SERIES.filter((s) => d[s.key] > 0);
      let base = 0;
      present.forEach((s, idx) => {
        const y0 = this.y(base);
        base += d[s.key];
        const y1 = this.y(base);
        const gap = idx > 0 ? GAP : 0;
        const h = Math.max(1, y0 - y1 - gap);
        out.push({ key: s.key, i, x, y: y1, w: barW, h, top: idx === present.length - 1 });
      });
    });
    return out;
  });

  /** Rectángulo con las esquinas superiores redondeadas solo en el extremo de la barra. */
  protected path(s: Segment): string {
    const r = s.top ? Math.min(RADIUS, s.w / 2, s.h) : 0;
    const { x, y, w, h } = s;
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }

  protected readonly xLabels = computed(() => {
    const data = this.data();
    const every = Math.max(1, Math.ceil(data.length / 7));
    return data
      .map((d, i) => ({ i, d }))
      .filter(({ i }) => i % every === 0 || i === data.length - 1)
      .map(({ i, d }) => ({ x: M.left + i * this.step() + this.step() / 2, text: this.formatDate(d.date) }));
  });

  protected readonly tooltip = computed(() => {
    const i = this.hovered();
    if (i === null) return null;
    const d = this.data()[i];
    const leftPct = ((M.left + (i + 0.5) * this.step()) / W) * 100;
    return { d, date: this.formatDate(d.date), leftPct: Math.min(85, Math.max(15, leftPct)) };
  });

  protected readonly ariaLabel = computed(() => {
    const total = this.data().reduce((sum, d) => sum + d.total, 0);
    return `Análisis por día durante ${this.data().length} días: ${total} en total. Los datos están también en la tabla.`;
  });

  protected hover(i: number | null): void {
    this.hovered.set(i);
  }

  /** 'YYYY-MM-DD' (UTC) -> 'dd/MM' sin pasar por Date (evita desfases de zona horaria). */
  protected formatDate(iso: string): string {
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
  }
}
