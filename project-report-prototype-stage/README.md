# Prototype Stage Report

`main.tex` is the UCS503 prototype-stage report, written against the TIET report
class (<https://ctan.org/pkg/tietreport>).

## Compiling on Overleaf

1. Create a project and upload **`main.tex`** and **`tietreport.cls`** (the class
   file is committed here so the project compiles without installing anything).
2. Set the compiler to **pdfLaTeX** — Menu → Compiler.
3. Recompile **twice**. The first pass writes the table of contents and the
   cross-references; the second one renders them.

There are no image files. Every diagram is drawn in TikZ inside `main.tex`, so
nothing can go missing when the project is shared or re-uploaded.

## Fill these in before submitting

Three placeholders are deliberately left visible on the title page:

| Placeholder | Where |
| --- | --- |
| `ROLLNO3` and `Teammate Name` | the `\author{...}` block |
| `GROUP` | the `\TitlePageSubText{...}` block |
| `Ms. Anushka` | `\AdvisorName{...}` — confirm the correct title and spelling |

## Diagrams

| Figure | Kind |
| --- | --- |
| 1.1 | The post / discover / request / close loop |
| 2.1 | **Use case diagram** — actors and their use cases |
| 2.2 | Include and extend around the core use cases |
| 2.3 | **Class diagram** — matches `code/backend/prisma/schema.prisma` |
| 2.4 | **Sequence diagram** — registration and email verification |
| 2.5 | **Sequence diagram** — anonymous posting and feed retrieval |
| 2.6 | **Activity diagram** — the goal lifecycle |
| 2.7 | System architecture |

Implemented elements are drawn with solid outlines and planned ones with dashed
outlines, so the state of the project can be read off any diagram directly.
