#MenuTitle: Swap Skeletype with Main Layer
# -*- coding: utf-8 -*-
"""
선택한 글리프들의 메인 레이어와 'Converted Skeletype' 레이어의
경로를 서로 스왑합니다.

결과: 메인 레이어 = 중심선, Converted Skeletype = 원본 경로

사용법:
1. Glyphs에서 글리프를 선택 (전체 선택: Cmd+A)
2. Macro Panel (Window > Macro Panel)에서 이 스크립트 실행
"""

font = Glyphs.font
if not font:
    print("폰트가 열려있지 않습니다.")
else:
    selectedLayers = font.selectedLayers
    if not selectedLayers:
        print("선택한 글리프가 없습니다.")
    else:
        master = font.selectedFontMaster
        swapped_count = 0
        skipped_count = 0

        for layer in selectedLayers:
            glyph = layer.parent
            if not glyph:
                continue

            # Converted Skeletype 레이어 찾기
            skeletype_layer = None
            for l in glyph.layers:
                if hasattr(l, 'name') and l.name == "Converted Skeletype":
                    skeletype_layer = l
                    break

            if not skeletype_layer or len(skeletype_layer.paths) == 0:
                skipped_count += 1
                continue

            # 메인 레이어 (현재 마스터)
            main_layer = glyph.layers[master.id]
            if not main_layer:
                skipped_count += 1
                continue

            # 경로 스왑: 메인 ↔ Converted Skeletype
            main_paths = [p.copy() for p in main_layer.paths]
            skeletype_paths = [p.copy() for p in skeletype_layer.paths]

            # 메인 레이어 비우고 중심선 넣기
            main_layer.shapes = None
            for p in skeletype_paths:
                main_layer.shapes.append(p)

            # Converted Skeletype 비우고 원본 넣기
            skeletype_layer.shapes = None
            for p in main_paths:
                skeletype_layer.shapes.append(p)

            swapped_count += 1

        print(f"완료: {swapped_count}개 글리프 스왑, {skipped_count}개 건너뜀")
        Glyphs.redraw()
