import "d3-scale";

declare module "d3-scale" {
  interface ScaleSymLog<Range, Output, Unknown> {
    interpolate(
      factory: (a: Range, b: Range) => (t: number) => Output
    ): this;
  }
}

