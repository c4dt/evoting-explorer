# EvotingExplorer

I was wondering what was stored in the skipchain that is used for the EPFL e-voting project.
And I wanted to know how many ballots have been cast, and whether my ballot has been included.
So I wrote this small explorer that shows all the elections available on the servers,
as well as the information of the ballots.
Of course the ballot itself is encrypted, so even if the content of the vote is displayed,
one cannot discover what each person voted.

[Evoting-Explorer](https://c4dt.github.io/evoting-explorer)

If you have any questions about this explorer, don't hesitate to contact 
[Linus Gasser](mailto:linus.gasser@epfl.ch)

(c) 2022 by C4DT

## Generation

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.2.17.

## Requirements

I tried it using node in version 14 and 16. Version 18 does not work.
To install the requirements, run the following:

```bash
npm i -g @angular/cli@12
npm ci
```

After this, you can run the development server or the build.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.
