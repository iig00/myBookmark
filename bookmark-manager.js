const $ = {
  bookmark: document.getElementById("bookmarkList"),
  tagList: document.getElementById("tagList"),
  bookmarkGroupTags: document.getElementById("bookmarkGroupTags"),
};

const bookmarks = initBookmarks(
  window.BOOKMARKS_DATA
);

const bookmarkMap = new Map(
  bookmarks.map((bookmark) => [
    bookmark.key,
    bookmark,
  ])
);

/*
 * lowerのタグを親のtagsへ追加
 */
addLowerTags(bookmarks, bookmarkMap);

const alltag = initAlltag(
  bookmarks,
  window.TAG_GROUP
);

// 空配列はAll選択と同じ
let selectTags = [];
let selectedTagGroup = "ALL";

const expandedBookmarkKeys = new Set();

/*
 * BOOKMARKS_DATAをフラットな配列に変換
 */
function initBookmarks(data) {
  const initializedBookmarks = [];

  for (const bookmarkGroup of Object.values(data || {})) {
    for (const [key, bookmarkData] of Object.entries(bookmarkGroup || {})) {
      const originalTags = Array.isArray(bookmarkData?.tags)
        ? [...bookmarkData.tags]
        : [];

      initializedBookmarks.push({
        ...bookmarkData,

        key,

        title: bookmarkData.title || key,

        tags: [...originalTags],

        groupTags: [...originalTags],

        lower:
          bookmarkData?.lower &&
          typeof bookmarkData.lower === "object" &&
          !Array.isArray(bookmarkData.lower)
            ? { ...bookmarkData.lower }
            : {},
      });
    }
  }

  return initializedBookmarks;
}
function initAlltag(bookmarks, tagGroups) {
  const allTagSet = new Set();

  /* 全ブックマークから全タグを収集 */
  for (const bookmark of bookmarks) {
    for (const tag of bookmark.tags || []) {
      allTagSet.add(tag);
    }
  }

  const groups = [];

  for (const [groupName, groupData] of Object.entries(tagGroups || {})) {
    if (!groupData || typeof groupData !== "object") continue;

    const mainTags = Array.isArray(groupData.main) ? [...groupData.main] : [];
    const definedSubTags = Array.isArray(groupData.sub) ? [...groupData.sub] : [];

    if (mainTags.length === 0) continue;

    let initializedSubTags;

    if (definedSubTags.length > 0) {
      /* subが明示されている場合は実際にデータ内に存在するものだけ抽出 */
      initializedSubTags = definedSubTags.filter((tag) => allTagSet.has(tag));
    } else {
      /* sub:[] の場合、mainをすべて持つブックマークから残りのタグを抽出 */
      const generatedSubTagSet = new Set();

      for (const bookmark of bookmarks) {
          const hasAllMainTags = mainTags.every(
            (mainTag) =>
              bookmark.groupTags.includes(mainTag)
          );

        if (!hasAllMainTags) continue;

        for (const tag of bookmark.groupTags || []) {
          if (!mainTags.includes(tag)) {
            generatedSubTagSet.add(tag);
          }
        }
      }

      initializedSubTags = Array.from(generatedSubTagSet);
    }

    initializedSubTags.sort((a, b) => a.localeCompare(b));

    groups.push({
      name: groupName,
      main: mainTags,
      sub: initializedSubTags,
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));

  const allTags = Array.from(allTagSet).sort((a, b) => a.localeCompare(b));

  /* どのグループにも所属しないタグを収集 */
  const noneTagSet = new Set();

  for (const bookmark of bookmarks) {
    const belongsToAnyGroup = groups.some((group) =>
      bookmarkMatchesTagGroup(bookmark, group)
    );

    if (belongsToAnyGroup) continue;

    for (const tag of bookmark.tags || []) {
      noneTagSet.add(tag);
    }
  }

  const noneTags = Array.from(noneTagSet).sort((a, b) => a.localeCompare(b));

  return {
    groups,
    all: allTags,
    none: noneTags,
  };
}


/*
 * lowerで参照されたブックマークのタグを
 * 親ブックマークのtagsへ追加する。
 *
 * groupTagsには追加しない。
 */
function addLowerTags(bookmarks, bookmarkMap) {
  for (const bookmark of bookmarks) {
    const inheritedTagSet = new Set(bookmark.tags);

    collectLowerTags(
      bookmark,
      bookmarkMap,
      inheritedTagSet,
      new Set()
    );

    bookmark.tags = Array.from(inheritedTagSet);
  }

  return bookmarks;
}

function collectLowerTags(
  bookmark,
  bookmarkMap,
  tagSet,
  visitedKeys
) {
  if (visitedKeys.has(bookmark.key)) {
    return;
  }

  const nextVisitedKeys = new Set(visitedKeys);
  nextVisitedKeys.add(bookmark.key);

  for (const lowerKey of Object.values(bookmark.lower || {})) {
    const lowerBookmark = bookmarkMap.get(lowerKey);

    if (!lowerBookmark) {
      console.warn(
        `lowerの参照先が見つかりません: ${lowerKey}`
      );
      continue;
    }

    /*
     * 下位ブックマーク自身の元タグを追加する。
     */
    for (const tag of lowerBookmark.groupTags) {
      tagSet.add(tag);
    }

    /*
     * 孫以下のlowerも追加する。
     */
    collectLowerTags(
      lowerBookmark,
      bookmarkMap,
      tagSet,
      nextVisitedKeys
    );
  }
}

// --------------------------------------------------
// グループ・タグ 状態取得ヘルパー
// --------------------------------------------------

function getSelectedGroup() {
  if (selectedTagGroup === "ALL" || selectedTagGroup === "none") {
    return null;
  }
  return alltag.groups.find((group) => group.name === selectedTagGroup) || null;
}

function isSelectedGroupSubTag(tag) {
  const selectedGroup = getSelectedGroup();
  return selectedGroup ? selectedGroup.sub.includes(tag) : false;
}

function getSelectedSubTag() {
  const selectedGroup = getSelectedGroup();
  if (!selectedGroup) return null;

  return selectTags.find((tag) => selectedGroup.sub.includes(tag)) ?? null;
}

function getLockedMainTags() {
  const selectedGroup = getSelectedGroup();
  return selectedGroup ? selectedGroup.main : [];
}

/*
 * ブックマークが指定グループに所属するか
 */
function bookmarkMatchesTagGroup(bookmark, group) {
  const hasAllMainTags = group.main.every(
    (mainTag) =>
      bookmark.groupTags.includes(mainTag)
  );

  if (!hasAllMainTags) {
    return false;
  }

  return group.sub.some(
    (subTag) =>
      bookmark.groupTags.includes(subTag)
  );
}

function bookmarkMatchesGroup(bookmark) {
  if (selectedTagGroup === "ALL") return true;

  if (selectedTagGroup === "none") {
    return !alltag.groups.some((group) =>
      bookmarkMatchesTagGroup(bookmark, group)
    );
  }

  const selectedGroup = getSelectedGroup();
  return selectedGroup ? bookmarkMatchesTagGroup(bookmark, selectedGroup) : false;
}

function isSelectedTagPath(tagPath) {
  if (isLockedMainTag(tagPath)) return true;
  if (tagPath.length !== 1) return false;

  return selectTags.includes(tagPath[0]);
}

function isLockedMainTag(tagPath) {
  if (tagPath.length !== 1) return false;
  return getLockedMainTags().includes(tagPath[0]);
}

function getVisibleTags(alltag) {
  if (selectedTagGroup === "ALL") return alltag.all;
  if (selectedTagGroup === "none") return alltag.none;

  const group = getSelectedGroup();
  return group ? group.sub : [];
}

// --------------------------------------------------
// イベントハンドラ & ロジック
// --------------------------------------------------

function selectBookmarkTag(tag) {
  if (isSelectedGroupSubTag(tag)) {
    const selectedGroup = getSelectedGroup();

    if (selectTags.includes(tag)) {
      // 解除
      selectTags = selectTags.filter((selectedTag) => selectedTag !== tag);
    } else {
      // 同グループのsubを解除して今回選択したものを追加
      selectTags = selectTags.filter(
        (selectedTag) => !selectedGroup.sub.includes(selectedTag)
      );
      selectTags.push(tag);
    }
  } else {
    // sub以外（複数選択可）
    if (selectTags.includes(tag)) {
      selectTags = selectTags.filter((selectedTag) => selectedTag !== tag);
    } else {
      selectTags.push(tag);
    }
  }

  renderTagSidebar(alltag);
  renderBookmarks(
    bookmarks,
    bookmarkMap,
    expandedBookmarkKeys
  );
}

function getBookmarkGroupExtraTags(targetBookmarks) {
  const selectedGroup = getSelectedGroup();

  if (!selectedGroup) {
    return [];
  }

  const selectedSubTag = getSelectedSubTag();

  /*
   * 選択中グループのmain・subは
   * 見出し上部の追加タグから除外する
   */
  const excludedTagSet = new Set([
    ...selectedGroup.main,
    ...selectedGroup.sub,
  ]);

  const extraTagSet = new Set();

  for (const bookmark of targetBookmarks) {
    /*
     * グループ所属判定にはgroupTagsを使用する。
     * lowerから追加されたタグは所属判定に使われない。
     */
    if (!bookmarkMatchesTagGroup(bookmark, selectedGroup)) {
      continue;
    }

    /*
     * subタグを選択している場合は、
     * そのsubを持つブックマークだけを対象にする。
     *
     * ここは通常検索用tagsを見る。
     */
    if (
      selectedSubTag !== null &&
      !bookmark.tags.includes(selectedSubTag)
    ) {
      continue;
    }

    /*
     * lowerから追加されたタグを含むtagsから
     * 見出し上部の追加タグを収集する
     */
    for (const tag of bookmark.tags || []) {
      if (!excludedTagSet.has(tag)) {
        extraTagSet.add(tag);
      }
    }
  }

  return Array.from(extraTagSet).sort(
    (a, b) => a.localeCompare(b)
  );
}

function bookmarkMatchesSelection(bookmark) {
  if (!bookmarkMatchesGroup(bookmark)) return false;
  return selectTags.every((tag) => bookmark.tags.includes(tag));
}

// --------------------------------------------------
// UI レンダリング・要素作成
// --------------------------------------------------

function createGroupButton(
  groupName,
  label = groupName,
  hasSubTags = false
) {
  const button = document.createElement("button");
  button.className = "tag-group-button";

  const labelSpan = document.createElement("span");
  labelSpan.className = "tag-group-label";
  labelSpan.textContent = label;

  button.appendChild(labelSpan);

  if (hasSubTags) {
    button.classList.add("has-subtags");
  }

  if (selectedTagGroup === groupName) {
    button.classList.add("selected");
  }

  button.addEventListener("click", () => {
    selectedTagGroup = groupName;
    selectTags = [];

    renderTagSidebar(alltag);
    renderBookmarks(
      bookmarks,
      bookmarkMap,
      expandedBookmarkKeys
    );
  });

  return button;
}

function createTagButton(tag, className) {
  const tagPath = [tag];
  const tagButton = document.createElement("button");

  tagButton.className = className;
  tagButton.dataset.label = tag;

  const label = document.createElement("span");
  label.textContent = tag;
  label.className = "tag-label";

  tagButton.appendChild(label);

  if (isSelectedTagPath(tagPath)) {
    tagButton.classList.add("selected");
  }

  if (isLockedMainTag(tagPath)) {
    tagButton.classList.add("locked");
    tagButton.setAttribute("aria-disabled", "true");
  }

  tagButton.addEventListener("click", () => {
    if (isLockedMainTag(tagPath)) return;

    selectBookmarkTag(tag);
  });

  return tagButton;
}

function createBookmark(
  bookmark,
  bookmarkMap,
  expandedBookmarkKeys,
  displayTitle = bookmark.title,
  parentKeys = new Set()
) {
  const li = document.createElement("li");

  /*
   * lower:
   * {
   *   表示名: 参照先キー
   * }
   */
  const lowerEntries = Object.entries(
    bookmark.lower || {}
  );

  /*
   * 実際に参照先が存在するlowerだけを取得
   */
  const validLowerEntries = lowerEntries.filter(
    ([, lowerKey]) => bookmarkMap.has(lowerKey)
  );

  const hasLowerBookmarks =
    validLowerEntries.length > 0;

  /*
   * lowerを持つタイトルはクリック可能なbuttonにする
   */
  if (hasLowerBookmarks) {
    const titleButton = document.createElement("button");
    titleButton.className = "title bookmark-title-button";

    const isExpanded =
      expandedBookmarkKeys.has(bookmark.key);

    const arrow = document.createElement("span");
    arrow.className = "bookmark-expand-mark";
    arrow.textContent = isExpanded ? "▼" : "▶";

    const titleLabel = document.createElement("span");
    titleLabel.textContent = displayTitle;

    titleButton.appendChild(arrow);
    titleButton.appendChild(titleLabel);

    titleButton.setAttribute(
      "aria-expanded",
      String(isExpanded)
    );

    titleButton.addEventListener("click", () => {
      if (expandedBookmarkKeys.has(bookmark.key)) {
        expandedBookmarkKeys.delete(bookmark.key);
      } else {
        expandedBookmarkKeys.add(bookmark.key);
      }

      renderBookmarks(
        bookmarks,
        bookmarkMap,
        expandedBookmarkKeys
      );
    });

    li.appendChild(titleButton);
  } else {
    const titleDiv = document.createElement("div");
    titleDiv.textContent = displayTitle;
    titleDiv.className = "title";

    li.appendChild(titleDiv);
  }

  const urlLink = document.createElement("a");
  urlLink.textContent = bookmark.url;
  urlLink.href = bookmark.url;
  urlLink.target = "_blank";
  urlLink.rel = "noopener noreferrer";
  urlLink.className = "bookmark-url";

  const tagsDiv = document.createElement("div");
  tagsDiv.className = "bookmark-tags";

  const tagFragment =
    document.createDocumentFragment();

  for (const tag of bookmark.tags) {
    tagFragment.appendChild(
      createTagButton(tag, "bookmark-tag")
    );
  }

  tagsDiv.appendChild(tagFragment);

  li.appendChild(urlLink);
  li.appendChild(tagsDiv);

  /*
   * 展開されていない場合は、
   * lowerを表示せずここで終了
   */
  if (
    !hasLowerBookmarks ||
    !expandedBookmarkKeys.has(bookmark.key)
  ) {
    return li;
  }

  /*
   * Google → GoogleNews → Google
   * のような循環参照を防ぐ
   */
  const nextParentKeys = new Set(parentKeys);
  nextParentKeys.add(bookmark.key);

  const lowerList = document.createElement("ul");
  lowerList.className = "lower-bookmark-list";

  for (const [lowerLabel, lowerKey] of validLowerEntries) {
    if (nextParentKeys.has(lowerKey)) {
      console.warn(
        `lowerの循環参照を検出しました: ${lowerKey}`
      );
      continue;
    }

    const lowerBookmark =
      bookmarkMap.get(lowerKey);

    lowerList.appendChild(
      createBookmark(
        lowerBookmark,
        bookmarkMap,
        expandedBookmarkKeys,
        lowerLabel,
        nextParentKeys
      )
    );
  }

  if (lowerList.children.length > 0) {
    li.appendChild(lowerList);
  }

  return li;
}


function renderBookmarkGroupTags(bookmarks) {
  $.bookmarkGroupTags.innerHTML = "";

  if (
    selectedTagGroup === "ALL" ||
    selectedTagGroup === "none"
  ) {
    return;
  }

  const extraTags =
    getBookmarkGroupExtraTags(bookmarks);

  const fragment =
    document.createDocumentFragment();

  for (const tag of extraTags) {
    fragment.appendChild(
      createTagButton(
        tag,
        "bookmark-heading-tag"
      )
    );
  }

  $.bookmarkGroupTags.appendChild(fragment);
}





function renderTagSidebar(alltag) {
  $.tagList.innerHTML = "";

  const sidebar = document.createElement("div");
  sidebar.className = "tag-sidebar-columns";

  const tagColumn = document.createElement("div");
  tagColumn.className = "tag-column";

  const groupColumn = document.createElement("div");
  groupColumn.className = "tag-group-column";

  /* 左側に表示するタグ */
  const visibleTags = getVisibleTags(alltag);

  /* 右側に並ぶグループ名 */
  const groupNames = [
    "ALL",
    "none",
    ...alltag.groups.map((group) => group.name),
  ];

  /* 選択中グループが上から何行目か */
  const selectedGroupRow = Math.max(
    groupNames.indexOf(selectedTagGroup),
    0
  );

  /*
   * subタグ数の上から1/3の位置。
   * 割り切れない場合は切り上げる。
   */
  const targetTagIndex = Math.max(
    Math.ceil(visibleTags.length / 3) - 1,
    0
  );

  

  /*
   * 1/3位置のsubタグを選択中グループの横に合わせる。
   * 先頭がALLより上に行く場合は0で止める。
   */
  const tagColumnStartRow = Math.max(
    selectedGroupRow - targetTagIndex,
    0
  );

  const connectedTagIndex =
  selectedGroupRow - tagColumnStartRow;

  tagColumn.style.setProperty(
    "--tag-column-start-row",
    tagColumnStartRow
  );

  /*
   * 実際のグループが選択され、
   * subタグが存在するときだけ接続線を表示する。
   */
  const selectedGroup = getSelectedGroup();

  const showSubTagTree =
    selectedGroup !== null &&
    visibleTags.length > 0;

if (showSubTagTree) {
  tagColumn.classList.add("sub-tag-tree");

  if (visibleTags.length === 1) {
    tagColumn.classList.add("single-sub-tag");
  }
}

  /* 左側：タグ一覧 */
  const tagFragment = document.createDocumentFragment();

for (const [index, tag] of visibleTags.entries()) {
  const tagRow = document.createElement("div");
  tagRow.className = "standalone-tag-row";

  /*
   * 選択中mainタグと同じ高さの行
   */
  if (
    showSubTagTree &&
    index === connectedTagIndex
  ) {
    tagRow.classList.add("connected-to-main");
  }

  tagRow.appendChild(
    createTagButton(tag, "tag-button standalone-tag")
  );

  tagFragment.appendChild(tagRow);
}

  tagColumn.appendChild(tagFragment);

  /* 右側：グループ一覧 */
  const groupFragment = document.createDocumentFragment();

  groupFragment.appendChild(
    createGroupButton("ALL")
  );

  groupFragment.appendChild(
    createGroupButton("none")
  );

  for (const group of alltag.groups) {
    groupFragment.appendChild(
      createGroupButton(
        group.name,
        group.name,
        group.sub.length > 0
      )
    );
  }

  groupColumn.appendChild(groupFragment);

  sidebar.appendChild(groupColumn);
  sidebar.appendChild(tagColumn);

  $.tagList.appendChild(sidebar);
}




function renderBookmarks(
  bookmarks,
  bookmarkMap,
  expandedBookmarkKeys
) {
  renderBookmarkGroupTags(bookmarks);

  $.bookmark.innerHTML = "";

  const list = document.createElement("ul");
  const fragment = document.createDocumentFragment();

  const matchedBookmarks = bookmarks.filter(
    (bookmark) =>
      bookmarkMatchesSelection(bookmark)
  );

  const displayedLowerKeys = new Set();

  for (const bookmark of matchedBookmarks) {
    for (const lowerKey of Object.values(
      bookmark.lower || {}
    )) {
      if (bookmarkMap.has(lowerKey)) {
        displayedLowerKeys.add(lowerKey);
      }
    }
  }

  const topLevelBookmarks =
    matchedBookmarks.filter(
      (bookmark) =>
        !displayedLowerKeys.has(bookmark.key)
    );

  for (const bookmark of topLevelBookmarks) {
    fragment.appendChild(
      createBookmark(
        bookmark,
        bookmarkMap,
        expandedBookmarkKeys
      )
    );
  }

  list.appendChild(fragment);
  $.bookmark.appendChild(list);
}

// 初期描画
renderTagSidebar(alltag);
renderBookmarks(
  bookmarks,
  bookmarkMap,
  expandedBookmarkKeys
);