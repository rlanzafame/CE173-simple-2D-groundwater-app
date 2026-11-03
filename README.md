# Simple 2D Groundater Flow Model

This is an application that was built entirely by GitHub Copilot. A working version was created after a single prompt. It was then refined using subsequent prompts (reproduced below).

This application is meant to bean interactive tool for exploring 2D groundwater flow, as well as illustrate the power of AI tools like GitHub Copilot for rapidly developing software applications.

This application has _not_ been thoroughly checked and is very likely to contain errors. That said, it appears to be making computations that are largely correct, based on visual inspections of the results.

## My Prompts to GitHub Copilot

_I asked GitHub Copilot to reproduce my prompts; the last prompt is the one that generated this section. The prompts listed here are what created the initial commit in this repository. The only file I edited was `README.md`---Copilot did the rest._

1. Prompt 1:

   > I want to make a browser-based interactive tool for exploring the diffusion equation in 2d. here are some requirements:
   > - make the app based in javascript with source in subdir app/ and run from a single html file called start.html
   >
   > - 2D problem: horizontal axis is x from 0 to user-specified limit, vertical axis starts at z=0 at the top and extends downward to user specified limit (down is positive z direction)
   > - set the problem up for groundwater flow using specific storage and hydraulic conductivity values as input parameters (K, Ss)
   > -  solve for hydraulic head at x and z in time: h(x,z,t)
   > - discretize the domain into regular rectangular grids
   > - create a special tab that allows the user to enter material properties in any cell and enter boundary conditions on the edges (dirichlet or neuman)
   > - allow users to specify source and sink terms at any cell in the domain
   > - include a "set edge" feature that will set one of the four edges to a specific dirichlet or neuman condition. this overrides any user-specified cell values
   > - include a solution tab that illustrates the head value for a particular cell and allows the user to specify a time step using a slider

2. Prompt 2:

   > wait
   >
   > more requirements

3. Prompt 3:

   > this is pretty cool. can you add/change the following?
   > - add a documentation tab that very briefly gives an overview of the app. include statements about material properties, model parameters, etc, that are defined in one place in the file system and used in the documentation tab, but also as "hover over" help bubbles for each place where data is entered
   >
   > - add hover over help bubbles

4. Prompt 4:

   > Can you add to the documentation some tables of typical values (state in SI and Imperial units) for K and Ss?

5. Prompt 5:

   > i need to see some more documentation on the discretization of the PDEs in time and space. Be explicit about which methods are used, and include equations and a diagram that shows how the generic continuity equations are solved for a given cell, including what information is taken from each adjacent cell. In addition, add the ability to switch between implicit and explicity time integration on the solution tab.

6. Prompt 6:

   > can you create a github actions workflow file that will put the application on a github server so that it can be accessed from a browser? it should run the action and update the website on push or pr/merge commit to main branch

7. Prompt 7:

   > add a section to the readme at the end called "My Prompts to GitHub Copilot" that reproduces verbatim (using GitHub Markdown quote syntax) my prompts in this chat. Number them.