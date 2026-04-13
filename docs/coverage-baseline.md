# Coverage Baseline (Sprint 2/3)

Дата фиксации: `2026-04-13`

Документ определяет, как интерпретировать покрытие в CI и какие метрики считаются целевыми.

## Виды метрик

В CI публикуются две метрики:

1. `Raw coverage`
   - покрытие по всему production-коду без исключений;
   - нужно для прозрачности и тренда.

2. `Meaningful coverage`
   - покрытие handwritten production code;
   - исключает технически-генерируемые файлы, которые искажают сигнал.

## Исключения для meaningful coverage

Из meaningful-метрики исключаются:

- `src/**/Migrations/**`;
- `*.Designer.cs`;
- `AppDbContextModelSnapshot.cs`.

## Источник данных

Coverage-артефакты собираются job-ом `coverage-report` в GitHub Actions workflow:

- `artifacts/coverage/raw/Summary.txt`
- `artifacts/coverage/raw/Cobertura.xml`
- `artifacts/coverage/meaningful/Summary.txt`
- `artifacts/coverage/meaningful/Cobertura.xml`

## Текущие зафиксированные значения

По состоянию на `2026-04-13` (unit + fast integration, CI-эквивалентный локальный прогон):

- `Fast integration`: `425/425`;
- `Raw line coverage`: `22.3%` (`8736 / 39092`);
- `Meaningful line coverage`: `87.1%` (`8736 / 10019`);
- `Raw branch coverage`: `66.0%` (`1518 / 2298`);
- `Meaningful branch coverage`: `66.0%` (`1518 / 2298`);
- `Meaningful coverage / Web`: `79.5%`.

Важно: значения baseline могут меняться по мере расширения тестового контура и изменения объема production-кода.

## Как читать baseline

- `Raw` используется как вторичная техническая метрика.
- `Meaningful` используется как основная инженерная метрика покрытия.
- Решения о качестве PR принимаются в первую очередь по рисковым тестам (unit + integration + sql), а не по одному только проценту coverage.
- В CI действует минимальный quality floor: `meaningful line coverage >= 50%`.
