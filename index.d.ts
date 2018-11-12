/// <reference types="node" />
/// <reference types="puppeteer" />
import {ReadStream} from "fs";
import {Gunzip} from "zlib";
import {Transform} from "stream";
import {URL} from 'url';
import {EventEmitter} from 'eventemitter3';
import {Page, Request, CDPSession} from "puppeteer";

interface Error {
    stack?: string;
    message?: string
}

export type NullableEr = Error | null

export class AutoWARCParser extends EventEmitter {
    _wp?: string;
    _parsing: boolean;
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    _getStream(): ReadStream | Gunzip;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCGzParser extends EventEmitter {
    _wp?: string;
    _parsing: boolean;
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCParser extends EventEmitter {
    _wp?: string;
    _parsing: boolean;
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCStreamTransform extends Transform {
    _consumeChunk(chunk: Buffer, done: () => void, pushLast?: boolean): void;
    _transform(buf: Buffer, enc: string, done: () => void): void;
    _flush(done: () => void): void;
}

export function recordIterator(warcStream: ReadStream | Gunzip): AsyncIterableIterator<WARCRecord>;

export interface WARCRecordParts {
    header: Buffer[];
    c1: Buffer[];
    c2: Buffer[];
}

export interface RequestHTTPInfo {
    requestLine: string;
    path: string;
    method: string;
    httpVersion: string;
    headers: Object;
}

export interface ResponseHTTPInfo {
    statusLine: string;
    statusCode: string;
    statusReason: string;
    httpVersion: string;
    headers: Object;
}

export class WARCRecord {
    warcHeader: Object;
    httpInfo?: RequestHTTPInfo | ResponseHTTPInfo;
    content: Buffer;
    warcType: string;
    warcRecordID: string;
    warcDate: string;
    warcContentLength: string;
    warcContentType: string;
    warcConcurrentTo: string;
    warcBlockDigest?: string;
    warcPayloadDigest?: string;
    warcIPAddress?: string;
    warcRefersTo?: string;
    warcRefersToTargetURI?: string;
    warcRefersToDate?: string;
    warcTargetURI: string;
    warcTruncated?: string;
    warcWarcinfoID?: string;
    warcFilename?: string;
    warcProfile?: string;
    warcIdentifiedPayloadType?: string;
    warcSegmentOriginID?: string;
    warcSegmentNumber?: string;
    warcSegmentTotalLength?: string;
    constructor (warcParts: WARCRecordParts);
    hasWARCHeader(headerKey: string): boolean;
    getWARCHeader(headerKey: string): string | undefined;
}


export class RecordBuilder {
    _parts: WARCRecordParts;
    _parsingState: symbol;
    buildRecord(): WARCRecord | null;
    consumeLine(line: Buffer): WARCRecord | null;
}

export class CDPRequestInfo {
    requestId?: string;
    _url?: string;
    urlFragment?: string;
    method?: string;
    protocol?: string;
    status?: string;
    statusText?: string;
    postData?: string;
    requestHeaders?: Object;
    requestHeaders_?: Object;
    requestHeadersText?: string;
    responseHeaders?: Object;
    responseHeadersText?: string;
    getBody: boolean;
    hasPostData: boolean;
    addResponse(res: Object, not3xx?: boolean): void;
    getParsedURL(): URL;
    serializeRequestHeaders(): string;
    serializeResponseHeaders(): string;
    canSerializeResponse(): boolean;
    _serializeRequestHeadersText(): string;
    _serializeRequestHeadersObj(): string;
    _getReqHeaderObj(): Object | null;
    _ensureProto(): void;
    _checkMethod(): void;
    _methProtoFromReqHeadText(requestHeadersText?: string): void;
    _correctProtocol(originalProtocol: string): string;
    static fromRequest(info: Object): CDPRequestInfo;
    static fromRedir(info: Object): CDPRequestInfo;
    static fromResponse(info: Object): CDPRequestInfo;
}

export class CapturedRequest {
    requestId: string;
    _reqs: Map<string, CDPRequestInfo>;
    constructor(info: Object);
    addRequestInfo(info: Object): void;
    url(): string | Array<string>;
    keys(): Iterator<string>;
    values(): Iterator<CDPRequestInfo>;
    static newOne(info: Object): CapturedRequest;
    [Symbol.iterator](): Iterator<CDPRequestInfo>;
}

export class RequestHandler {
    _capture: boolean;
    requests: Map<string, CapturedRequest>;
    startCapturing(): void;
    stopCapturing(): void;
    addRequestInfo(info: Object): void;
    clear(): void;
    size(): number;
    entries(): Iterator<[string, CapturedRequest]>;
    values(): Iterator<CapturedRequest>;
    keys(): Iterator<string>;
    forEach(iteratee: (entry: [string, CapturedRequest]) => any, thisArg?: any): void;
    requestWillBeSent(info: Object): void;
    responseReceived(info: Object): void;
    iterateRequests(): Iterator<CDPRequestInfo>;
    [Symbol.iterator](): Iterator<[string, CapturedRequest]>;
}

export class ElectronRequestCapturer extends RequestHandler {
    attach (wcDebugger: Object): void;
    maybeNetworkMessage(method: string, params: string): void;
}

export class PuppeteerRequestCapturer {
    _capture: boolean;
    _requests: Array<Request>;
    constructor (page?: Page);
    attach (page: Page): void;
    detach (page: Page): void;
    startCapturing(): void;
    stopCapturing(): void;
    requestWillBeSent(r: Request): void;
    iterateRequests(): Iterator<Request>;
    requests(): Array<Request>;
    [Symbol.iterator](): Iterator<Request>;
}

export class PuppeteerCDPRequestCapturer extends RequestHandler {
    constructor (client?: CDPSession);
    attach(client: CDPSession);
    detach(client: CDPSession);
}

export class RemoteChromeRequestCapturer extends RequestHandler {
    constructor(network?: Object);
    attach(network: Object);
    detach(cdpClient: Object);
}

export type WARCContentData = Buffer | string

export interface WARCFileOpts {
    appending?: boolean,
    gzip?: boolean
}

export interface WARCInitOpts {
    warcPath: string,
    appending?: boolean,
    gzip?: boolean
}

export interface ResReqData {
    headers: string,
    data?: Buffer | string
}

export interface Metadata {
    targetURI: string,
    content?: WARCContentData
}

export interface WARCInfoContent {
    version: string,
    isPartOfV?: string,
    warcInfoDescription?: string,
    ua?: string,
}

export interface WARCGenOpts {
    warcOpts: WARCInitOpts,
    winfo?: WARCInfoContent,
    metadata?: Metadata
}

export class WARCWriterBase extends EventEmitter {
    initWARC (warcPath: string, options: WARCFileOpts): void;
    writeRequestResponseRecords (targetURI: string, reqData: ResReqData, resData: ResReqData): Promise<void>;
    writeWarcInfoRecord (isPartOfV: string, warcInfoDescription: string, ua: string): Promise<void>;
    writeWarcRawInfoRecord (warcInfoContent: WARCContentData): Promise<void>;
    writeWarcMetadataOutlinks (targetURI: string, outlinks: string): Promise<void>;
    writeWarcMetadata (targetURI: string, metaData: WARCContentData): Promise<void>;
    writeRequestRecord (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeResponseRecord (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeRecordBlock (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeRecordChunks (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    end(): Promise<void>;
    _writeRequestRecord(targetURI: string, resId: string | null, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    _writeResponseRecord(targetURI: string, resId: string | null, httpHeaderString: string, responseData?: WARCContentData): Promise<void>;
    _onFinish(): void;
    _onError(error: Error): void;
    on(event: 'finished', cb: (error?: Error) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
}

export class ElectronWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: ElectronRequestCapturer, network: Object, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, wcDebugger: Object): Promise<void>;
}

export class PuppeteerWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: PuppeteerRequestCapturer, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (request: Request): Promise<void>;
}

export class PuppeteerCDPWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: PuppeteerCDPRequestCapturer, client: CDPSession, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, client: CDPSession): Promise<void>;
}

export class RemoteChromeWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: RemoteChromeRequestCapturer, network: Object, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, network: Object): Promise<void>;
}