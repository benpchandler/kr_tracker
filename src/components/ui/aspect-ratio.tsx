"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentProps<typeof AspectRatioPrimitive.Root>
>((props, ref) => {
  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      data-slot="aspect-ratio"
      {...props}
    />
  );
});

AspectRatio.displayName = AspectRatioPrimitive.Root.displayName;

export { AspectRatio };
