from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class PluginCategory(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    INPUT: _ClassVar[PluginCategory]
    OUTPUT: _ClassVar[PluginCategory]
    MIDDLEWARE: _ClassVar[PluginCategory]

class ConversionMode(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DIRECT: _ClassVar[ConversionMode]
    SPLIT: _ClassVar[ConversionMode]
    MERGE: _ClassVar[ConversionMode]

class ConflictPolicy(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SKIP: _ClassVar[ConflictPolicy]
    PROMPT: _ClassVar[ConflictPolicy]
    OVERWRITE: _ClassVar[ConflictPolicy]
    RENAME: _ClassVar[ConflictPolicy]
INPUT: PluginCategory
OUTPUT: PluginCategory
MIDDLEWARE: PluginCategory
DIRECT: ConversionMode
SPLIT: ConversionMode
MERGE: ConversionMode
SKIP: ConflictPolicy
PROMPT: ConflictPolicy
OVERWRITE: ConflictPolicy
RENAME: ConflictPolicy

class PluginInfo(_message.Message):
    __slots__ = ()
    IDENTIFIER_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    AUTHOR_FIELD_NUMBER: _ClassVar[int]
    WEBSITE_FIELD_NUMBER: _ClassVar[int]
    JSON_SCHEMA_FIELD_NUMBER: _ClassVar[int]
    FILE_FORMAT_FIELD_NUMBER: _ClassVar[int]
    SUFFIXES_FIELD_NUMBER: _ClassVar[int]
    ICON_BASE64_FIELD_NUMBER: _ClassVar[int]
    UI_JSON_SCHEMA_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_JSON_VALUE_FIELD_NUMBER: _ClassVar[int]
    identifier: str
    name: str
    version: str
    description: str
    author: str
    website: str
    json_schema: str
    file_format: str
    suffixes: _containers.RepeatedScalarFieldContainer[str]
    icon_base64: str
    ui_json_schema: str
    default_json_value: str
    def __init__(self, identifier: _Optional[str] = ..., name: _Optional[str] = ..., version: _Optional[str] = ..., description: _Optional[str] = ..., author: _Optional[str] = ..., website: _Optional[str] = ..., json_schema: _Optional[str] = ..., file_format: _Optional[str] = ..., suffixes: _Optional[_Iterable[str]] = ..., icon_base64: _Optional[str] = ..., ui_json_schema: _Optional[str] = ..., default_json_value: _Optional[str] = ...) -> None: ...

class PluginInfosRequest(_message.Message):
    __slots__ = ()
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    category: PluginCategory
    language: str
    def __init__(self, category: _Optional[_Union[PluginCategory, str]] = ..., language: _Optional[str] = ...) -> None: ...

class PluginInfosResponse(_message.Message):
    __slots__ = ()
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedCompositeFieldContainer[PluginInfo]
    def __init__(self, values: _Optional[_Iterable[_Union[PluginInfo, _Mapping]]] = ...) -> None: ...

class ConversionGroup(_message.Message):
    __slots__ = ()
    GROUP_ID_FIELD_NUMBER: _ClassVar[int]
    FILE_PATHS_FIELD_NUMBER: _ClassVar[int]
    group_id: str
    file_paths: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, group_id: _Optional[str] = ..., file_paths: _Optional[_Iterable[str]] = ...) -> None: ...

class ConversionRequest(_message.Message):
    __slots__ = ()
    class MiddlewareOptionsEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    INPUT_FORMAT_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FORMAT_FIELD_NUMBER: _ClassVar[int]
    MODE_FIELD_NUMBER: _ClassVar[int]
    MAX_TRACK_COUNT_FIELD_NUMBER: _ClassVar[int]
    GROUPS_FIELD_NUMBER: _ClassVar[int]
    INPUT_OPTIONS_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_OPTIONS_FIELD_NUMBER: _ClassVar[int]
    MIDDLEWARE_OPTIONS_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    input_format: str
    output_format: str
    mode: ConversionMode
    max_track_count: int
    groups: _containers.RepeatedCompositeFieldContainer[ConversionGroup]
    input_options: str
    output_options: str
    middleware_options: _containers.ScalarMap[str, str]
    language: str
    def __init__(self, input_format: _Optional[str] = ..., output_format: _Optional[str] = ..., mode: _Optional[_Union[ConversionMode, str]] = ..., max_track_count: _Optional[int] = ..., groups: _Optional[_Iterable[_Union[ConversionGroup, _Mapping]]] = ..., input_options: _Optional[str] = ..., output_options: _Optional[str] = ..., middleware_options: _Optional[_Mapping[str, str]] = ..., language: _Optional[str] = ...) -> None: ...

class SingleConversionResult(_message.Message):
    __slots__ = ()
    GROUP_ID_FIELD_NUMBER: _ClassVar[int]
    RUNNING_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    WARNING_MESSAGES_FIELD_NUMBER: _ClassVar[int]
    group_id: str
    running: bool
    completed: bool
    error_message: str
    warning_messages: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, group_id: _Optional[str] = ..., running: _Optional[bool] = ..., completed: _Optional[bool] = ..., error_message: _Optional[str] = ..., warning_messages: _Optional[_Iterable[str]] = ...) -> None: ...

class VersionRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class VersionResponse(_message.Message):
    __slots__ = ()
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: str
    def __init__(self, version: _Optional[str] = ...) -> None: ...

class MoveFileRequest(_message.Message):
    __slots__ = ()
    GROUP_ID_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_DIR_FIELD_NUMBER: _ClassVar[int]
    STEM_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FORMAT_FIELD_NUMBER: _ClassVar[int]
    CONFLICT_POLICY_FIELD_NUMBER: _ClassVar[int]
    FORCE_OVERWRITE_FIELD_NUMBER: _ClassVar[int]
    group_id: str
    output_dir: str
    stem: str
    output_format: str
    conflict_policy: ConflictPolicy
    force_overwrite: bool
    def __init__(self, group_id: _Optional[str] = ..., output_dir: _Optional[str] = ..., stem: _Optional[str] = ..., output_format: _Optional[str] = ..., conflict_policy: _Optional[_Union[ConflictPolicy, str]] = ..., force_overwrite: _Optional[bool] = ...) -> None: ...

class MoveFileResponse(_message.Message):
    __slots__ = ()
    GROUP_ID_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_PATH_FIELD_NUMBER: _ClassVar[int]
    CONFLICT_POLICY_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    group_id: str
    output_path: str
    conflict_policy: ConflictPolicy
    completed: bool
    success: bool
    error_message: str
    def __init__(self, group_id: _Optional[str] = ..., output_path: _Optional[str] = ..., conflict_policy: _Optional[_Union[ConflictPolicy, str]] = ..., completed: _Optional[bool] = ..., success: _Optional[bool] = ..., error_message: _Optional[str] = ...) -> None: ...
