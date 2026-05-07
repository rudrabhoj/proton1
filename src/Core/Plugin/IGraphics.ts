export type BlendModeName = 'normal' | 'add' | 'multiply' | 'screen' | 'darken' | 'lighten' | 'overlay' | 'difference';
export type BorderStyle = 'solid' | 'none' | 'dashed' | 'dotted';

export interface IGraphics {
  rect(x: number, y: number, w: number, h: number): IGraphics;
  circle(cx: number, cy: number, r: number): IGraphics;
  ellipse(cx: number, cy: number, rx: number, ry: number): IGraphics;
  roundRect(x: number, y: number, w: number, h: number, radius: number): IGraphics;

  fillColor: number;
  fillAlpha: number;
  fillBlend: BlendModeName;

  borderWidth: number;
  borderColor: number;
  borderAlpha: number;
  borderStyle: BorderStyle;

  redraw(): void;

  readonly data: any;
}
