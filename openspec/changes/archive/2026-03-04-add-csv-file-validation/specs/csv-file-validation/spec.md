## ADDED Requirements

### Requirement: Validar tipo de archivo CSV

El sistema **SHALL** validar que los archivos subidos sean de tipo CSV o TXT antes de procesarlos.

#### Scenario: Archivo válido mediante drag-and-drop

- **WHEN** el usuario arrastra un archivo .csv o .txt al área de drop
- **THEN** el archivo se selecciona y se muestra como listo para procesar

#### Scenario: Archivo válido mediante file picker

- **WHEN** el usuario hace clic y selecciona un archivo .csv o .txt
- **THEN** el archivo se selecciona y se muestra como listo para procesar

#### Scenario: Archivo inválido mediante file picker

- **WHEN** el usuario hace clic y selecciona un archivo que no es .csv ni .txt
- **THEN** el archivo NO se selecciona, se muestra un error indicando tipo de archivo inválido

#### Scenario: Archivo inválido al intentar subir

- **WHEN** el usuario intenta subir un archivo que no es .csv ni .txt (por cualquier medio)
- **THEN** se muestra un error y el archivo no se procesa
