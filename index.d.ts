/// <reference types="node" />
/// <reference types="puppeteer" />
import {ReadStream} from "fs";
import {Gunzip} from "zlib";
import {Transform} from "stream";
import {URL} from 'url';
import { EventEmitter } from "eventemitter3";
import * as puppeteer  from 'puppeteer'

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
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>;
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
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>;
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
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>;
}

export class WARCStreamTransform extends Transform {
    _consumeChunk(chunk: Buffer, done: () => void, pushLast?: boolean): void;
    _transform(buf: Buffer, enc: string, done: () => void): void;
    _flush(done: () => void): void;
    push(record: WARCRecord): boolean;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>;
}

export function recordIterator(warcStream: ReadStream | Gunzip): AsyncIterableIterator<WARCRecord>;

export class GzipDetector {
    static isGzipped(filePath: string): Promise<boolean>;
    static isGzippedSync(filePath: string): boolean;
}

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
    headers: object;
}

export interface ResponseHTTPInfo {
    statusLine: string;
    statusCode: string;
    statusReason: string;
    httpVersion: string;
    headers: object;
}

export class WARCRecord {
    warcHeader: object;
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

export class ContentParser {
    static utf8BufferSlice (buf: Buffer, start: number, end: number): string;
    static bufEndPosNoCRLF (buf: Buffer, bufLen: number): number;
    static parseHTTPPortion (bufs: Buffer[], req: boolean): RequestHTTPInfo | ResponseHTTPInfo;
    static parseWarcRecordHeader (bufs: Buffer[]): object;
    static parseWarcInfoMetaDataContent (bufs: Buffer[]): object;
    static parseReqHTTP (bufs: Buffer[]): object;
    static parseResHTTP (bufs: Buffer[]): object;
    static _parseHeaders (headerBuffs: Buffer[]): object;
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
    requestHeaders?: object;
    requestHeaders_?: object;
    requestHeadersText?: string;
    responseHeaders?: object;
    responseHeadersText?: string;
    getBody: boolean;
    hasPostData: boolean;
    addResponse(res: object, not3xx: boolean): void;
    getParsedURL(): URL;
    serializeRequestHeaders(): string;
    serializeResponseHeaders(): string;
    canSerializeResponse(): boolean;
    static fromRequest(info: object): CDPRequestInfo;
    static fromRedir(info: object): CDPRequestInfo;
    static fromResponse(info: object): CDPRequestInfo;
    _serializeRequestHeadersText(): string;
    _serializeRequestHeadersObj(): string;
    _getReqHeaderObj(): object | null;
    _ensureProto(): void;
    _checkMethod(): void;
    _methProtoFromReqHeadText(requestHeadersText?: string): void;
    _correctProtocol(originalProtocol: string): string;
}

export class CapturedRequest {
    requestId: string;
    _reqs: Map<string, CDPRequestInfo>;
    constructor(info: object);
    addRequestInfo(info: object): void;
    url(): string | string[];
    keys(): Iterator<string>;
    values(): Iterator<CDPRequestInfo>;
    static newOne(info: object): CapturedRequest;
    [Symbol.iterator](): Iterator<CDPRequestInfo>;
}

export class RequestHandler {
    _capture: boolean;
    requests: Map<string, CapturedRequest>;
    startCapturing(): void;
    stopCapturing(): void;
    addRequestInfo(info: object): void;
    clear(): void;
    size(): number;
    entries(): Iterator<[string, CapturedRequest]>;
    values(): Iterator<CapturedRequest>;
    keys(): Iterator<string>;
    forEach(iteratee: (entry: [string, CapturedRequest]) => any, thisArg?: any): void;
    requestWillBeSent(info: object): void;
    responseReceived(info: object): void;
    iterateRequests(): Iterator<CDPRequestInfo>;
    [Symbol.iterator](): Iterator<[string, CapturedRequest]>;
}

export class ElectronRequestCapturer extends RequestHandler {
    attach (wcDebugger: object): void;
    maybeNetworkMessage(method: string, params: string): void;
}

export class PuppeteerRequestCapturer {
    _capture: boolean;
    _requests: Map<number, puppeteer.Request>;
    _requestC: number;
    constructor (page?: puppeteer.Page, requestEvent?: string = 'request');
    attach (page: puppeteer.Page, requestEvent?: string = 'request'): void;
    detach (page: puppeteer.Page, requestEvent?: string = 'request'): void;
    startCapturing(): void;
    stopCapturing(): void;
    requestWillBeSent(r: puppeteer.Request): void;
    iterateRequests(): Iterator<puppeteer.Request>;
    requests(): puppeteer.Request[];
    [Symbol.iterator](): Iterator<puppeteer.Request>;
}

export class PuppeteerCDPRequestCapturer extends RequestHandler {
    constructor (client?: puppeteer.CDPSession);
    attach(client: puppeteer.CDPSession);
    detach(client: puppeteer.CDPSession);
}

export class RemoteChromeRequestCapturer extends RequestHandler {
    constructor(network?: object);
    attach(network: object);
    detach(cdpClient: object);
}

export type CRIEPage = object
export type CRIERequest = object

export class CRIExtraRequestCapturer {
    _capture: boolean;
    _requests: Map<number, CRIERequest>;
    _requestC: number;
    constructor (page?: CRIEPage, requestEvent?: string = 'request');
    attach (page: CRIEPage, requestEvent?: string = 'request'): void;
    detach (page: CRIEPage, requestEvent?: string = 'request'): void;
    startCapturing(): void;
    stopCapturing(): void;
    requestWillBeSent(r: CRIERequest): void;
    iterateRequests(): Iterator<CRIERequest>;
    requests(): CRIERequest[];
    [Symbol.iterator](): Iterator<CRIERequest>;
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

export type WARCInfoContent = Object | Buffer | string

export interface WARCGenOpts {
    warcOpts: WARCInitOpts,
    winfo?: WARCInfoContent,
    metadata?: Metadata,
    pages?: string | string[]
}

export class WARCWriterBase extends EventEmitter {
    constructor (defaultOpts?: WARCFileOpts);
    setDefaultOpts (defaultOpts: WARCFileOpts): void;
    initWARC (warcPath: string, options: WARCFileOpts): void;
    writeRequestResponseRecords (targetURI: string, reqData: ResReqData, resData: ResReqData): Promise<void>;
    writeWarcInfoRecord (winfo: WARCInfoContent): Promise<void>;
    writeWarcRawInfoRecord (warcInfoContent: WARCContentData): Promise<void>;
    writeWebrecorderBookmarksInfoRecord (pages: string | string[]): Promise<void>;
    writeWarcMetadataOutlinks (targetURI: string, outlinks: string): Promise<void>;
    writeWarcMetadata (targetURI: string, metaData: WARCContentData): Promise<void>;
    writeRequestRecord (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeResponseRecord (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeRecordBlock (targetURI: string, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    writeRecordChunks (...recordParts: Buffer[]): Promise<void>;
    end(): void;
    _writeRequestRecord(targetURI: string, resId: string | null, httpHeaderString: string, requestData?: WARCContentData): Promise<void>;
    _writeResponseRecord(targetURI: string, resId: string | null, httpHeaderString: string, responseData?: WARCContentData): Promise<void>;
    _onFinish(): void;
    _onError(error: Error): void;
    on(event: 'finished', cb: (error?: Error) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
}

export class ElectronWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: ElectronRequestCapturer, network: object, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, wcDebugger: object): Promise<void>;
}

export class PuppeteerWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: PuppeteerRequestCapturer, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (request: puppeteer.Request): Promise<void>;
}

export class PuppeteerCDPWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: PuppeteerCDPRequestCapturer, client: puppeteer.CDPSession, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, client: puppeteer.CDPSession): Promise<void>;
}

export class RemoteChromeWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: RemoteChromeRequestCapturer, network: object, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (nreq: CDPRequestInfo, network: object): Promise<void>;
}

export class RequestLibWARCGenerator extends WARCWriterBase {
    generateWarcEntry (resp: object): Promise<void>;
}

export class CRIExtraWARCGenerator extends WARCWriterBase {
    generateWARC (capturer: CRIExtraRequestCapturer, genOpts: WARCGenOpts): Promise<NullableEr>;
    generateWarcEntry (request: CRIERequest): Promise<void>;
}
