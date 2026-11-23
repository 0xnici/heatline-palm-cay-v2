# HEATLINE: Palm Cay — art direction concepts

Three directions were drawn up before the city was built. Each was judged against one question:
will a frame of this game still communicate "open-world crime game" when it is shrunk into a
contact-sheet cell? The answer decided the build.

## Concept 1 — Neon Byte City (REJECTED)

A rain-slick cyberpunk grid: violet and magenta signs, cyan holograms, wet asphalt reflections,
flying traffic and a skyline of identical black towers. The palette is fashionable but generic;
at thumbnail size every screen collapses into the same purple-and-blue haze. Reflections cost a
lot of rendering effort and buy no readable information. Most importantly, a neon night city is
the first thing every small browser crime game reaches for, so it would not read as original.
Rejected: the whole look fights the requirement that the first screenshot work at a glance.

## Concept 2 — Dustbelt Noir

A dry inland border city: adobe blocks, dust storms, long hard shadows, rust-red pickups, a
monochrome ochre palette and tumbleweed rolling past shuttered motels. Strong identity and easy
to read, but the palette is too narrow: cars, roads and buildings all land in the same brown
range. A chase loses its shape when everything on screen is the same colour, and the lack of
water removes the bright edge that makes a top-down map instantly legible. Kept only as a note:
hard directional shadows and a limited palette are worth stealing.

## Concept 3 — Sun-Bleached Coastal Noir (CHOSEN)

A golden-hour coastal city built on a clean north-south grid. Warm cream pavement, coral and
teal pastel roofs, a saturated blue-green ocean on the east edge, and deep plum shadows that
fall west from every building. Every district has one job: Marina Row's boathouses, Old Palm's
low shops and arcades, Sunset Flats' apartment blocks, the Glass Quarter's offices, Tidewater's
beachfront bars and piers. Names are printed big enough to read in a minimap and on the street.

The selling point is thumbnail legibility. Shape does the work: roads are wide dark ribbons,
roofs are flat colour fields with a bright sun edge, palms are a dark disc with radiating
fronds, the ocean is a flat teal band with white foam, and the player is a red coupe with a
white outline. The HUD uses heavy panels and 20-28px type, so wanted stars, objective banner,
health, minimap and speedometer all survive a 300px-wide cell. Colour is never the only signal:
police flash white and blue, mission markers are gold diamonds, packages are glowing crates.

Decision: build concept 3. The first screenshot is a live chase frame on the coastal avenue —
red coupe at speed, stars lit, interceptor closing, traffic, objective, minimap, speedometer and
a small corner lockup — with the real title screen kept in the game for play.

## The thumbnail test

The four capture scenes were chosen as a set, not as pretty pictures. Together they show the
systems a player would look for in an open-world crime game: a car at speed with police response,
a pedestrian street with a fixer and a dialogue, a full five-star pursuit, and a mission being
fought out on the sand. Every frame is drawn by the game's own renderer from a fixed seed, so the
same coordinates always produce the same image and a change to the art shows up in the captures.

Three rules keep the look readable when the contact sheet shrinks it:

- Silhouette first. A car is a long bright box with a white rim; a palm is one dark disc with
  seven fronds; a mission goal is a gold diamond inside a ring. None depends on a subtle colour
  difference or a thin outline.
- Value contrast over detail. Roofs are flat pastel fields with one bright sun edge and one dark
  edge, and every building casts a plum shadow. The eye reads the block grid before it reads the
  shop awnings or roof windows.
- UI weight. Panels are opaque enough to sit over busy traffic, and their type starts at 18px with
  the important numbers at 24-30px. The top-centre banner, the top-right stars, the bottom-left
  minimap and the bottom-right health and speedo occupy four separate corners.

The ocean band gives every driving shot a hard, bright edge on the right, so a viewer can tell
instantly that this city has a coast rather than being an anonymous grid. The small HEATLINE /
PALM CAY lockup in the top-left corner of every live frame keeps the name in the sheet even when
the title screen is not the cover.
