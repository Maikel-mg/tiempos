## ADDED Requirements

### Requirement: Registry contains all spNETTiempos_Alta parameters
The internal registry SHALL define all parameters for spNETTiempos_Alta stored procedure.

#### Scenario: Required parameters are defined
- **WHEN** accessing registry for spNETTiempos_Alta
- **THEN** includes required params: Usured, Fecha, HoraDesde, HoraHasta, Minutos, Proceso, pTipoHora

#### Scenario: Optional parameters have defaults
- **WHEN** accessing registry for spNETTiempos_Alta
- **THEN** optional params include defaults: @pTeleTrabajo=1, @pGastos=0, @Rapport=0

### Requirement: Registry contains all spNETTiempos_Procesos_Mantenimiento parameters
The internal registry SHALL define all parameters for task/process creation stored procedure.

#### Scenario: Task creation params are defined
- **WHEN** accessing registry for spNETTiempos_Procesos_Mantenimiento
- **THEN** includes all ~40 parameters with their types and defaults

### Requirement: Parameter changes require single update
When stored procedure parameters change, updates SHALL be made in one place.

#### Scenario: Adding new parameter
- **WHEN** a new parameter needs to be added to spNETTiempos_Alta
- **THEN** only the registry file needs modification
