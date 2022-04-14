![doqment icon](docs/logo.png)

# doqment

*doqment* (pronounced as *doc-HUE-ment*) is a custom deployment of the
[PDF.js][1] generic viewer with [*doq*][2] reader mode add-on (that lets you
change the PDF's colors) on top, packaged as an extension for Firefox. It
replaces the built-in PDF.js viewer as the default PDF viewer application.

Here is the demo PDF rendered in *Solarized Light* color scheme:

![Screenshot of doqment running in Firefox](docs/grabs/solarized-light.png)

View [more screenshots](docs/gallery.md#color-schemes).

## Installation

[ ![Get the Add-on](docs/get-addon.png) ][4]

Latest release can be installed from [AMO][4] or downloaded from [Releases][5].

It is recommended to disable the built-in viewer while this extension is
enabled to avoid funny and weird behaviours while opening/downloading PDFs.
(Go to *Settings* -> *Files and Applications* -> set the *Action* for PDF to
something other than *Open in Firefox*).

## Development and testing

1. Clone this repo recursively (to get the submodules)
2. Hack to your heart's content
3. Run the `pack.sh` script from the repo root
4. Install the created Zip file from `about:debugging` (or using `web-ext`)

## Limitations

Compared with the viewer baked right into Firefox's code, an extension is a lot
less previleged and hence, has certain limitations:

1. Cannot load local files via the `file:///` scheme. The user has to first
   open the extension's viewer in a tab and use the viewer's UI to open them.
   (hence a browser toolbar button is provided for this).
2. Cannot use the integrated Findbar to search for text in PDF.
3. The address bar shows an ugly extension URL instead of the original PDF URL.

## Rationale

As the built-in viewer of Firefox is a previleged page, extensions cannot
modify it. Thus a custom deployment is currently the only way to ship add-ons
to the viewer (other than getting your patch merged into PDF.js).

This project can also be used as a boilerplate by anyone else wishing to
develop their own awesome crazy add-on for the PDF.js viewer.

For the rationale behind reader mode see the *doq* [Readme][3].

Happy PDF Reading!

---

[1]: https://mozilla.github.io/pdf.js/web/viewer.html
[2]: https://github.com/shivaprsd/doq
[3]: https://github.com/shivaprsd/doq#why-doq
[4]: https://addons.mozilla.org/addon/doqment
[5]: https://github.com/shivaprsd/doqment/releases/latest
